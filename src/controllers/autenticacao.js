// Importei as bibliotecas necessárias
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const jwt = require('jsonwebtoken'); // Para gerar tokens JWT
const pool = require('../config/database'); // aqui Conecta com banco de dados

// criei a função auxiliar para validar formato de email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// essa é a função para registrar um novo usuário no sistema
async function registrarUsuario(req, res) {
  try {
    // aqui extrai os dados do corpo da requisição
    const { nome, email, senha, idEstudante } = req.body;

    // aqui valida os dados de entrada
    if (!nome || nome.trim().length < 2) {
      return res.status(400).json({
        erro: 'Nome inválido',
        mensagem: 'O nome deve ter pelo menos 2 caracteres'
      });
    }

    if (!email || !validarEmail(email)) {
      return res.status(400).json({
        erro: 'Email inválido',
        mensagem: 'Por favor, forneça um email válido'
      });
    }

    if (!senha || senha.length < 6) {
      return res.status(400).json({
        erro: 'Senha inválida',
        mensagem: 'A senha deve ter pelo menos 6 caracteres'
      });
    }

    if (!idEstudante || idEstudante.trim().length === 0) {
      return res.status(400).json({
        erro: 'ID do estudante obrigatório',
        mensagem: 'O ID do estudante é obrigatório'
      });
    }

    //  aqui verifica se o email já está sendo usado por outro usuario
    const emailExistente = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailExistente.rows.length > 0) {
      return res.status(400).json({
        erro: 'Email já cadastrado',
        mensagem: 'Este email já está sendo usado por outro usuário'
      });
    }

    // aqui verifica se o id do estudante já está sendo usado
    const idEstudanteExistente = await pool.query(
      'SELECT id FROM usuarios WHERE id_estudante = $1',
      [idEstudante]
    );

    if (idEstudanteExistente.rows.length > 0) {
      return res.status(400).json({
        erro: 'ID do estudante já cadastrado',
        mensagem: 'Este ID de estudante já está sendo usado'
      });
    }

    // aqui criptografa a senha antes de salvar no banco
    // O número 10 é o "salt rounds" - quanto maior, mais seguro porem mais lento
    const senhaHash = await bcrypt.hash(senha, 10);

    // aqui insere o novo usuário no banco de dados
    // $1, $2, etc são placeholders para evitar SQL injection  :)

    const novoUsuario = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, id_estudante) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, nome, email, id_estudante, max_emprestimos, criado_em`,
      [nome.trim(), email.toLowerCase(), senhaHash, idEstudante]
    );

    // aqui vai gerar um token JWT para o usuário recém criado
    const token = jwt.sign(
      { 
        id: novoUsuario.rows[0].id,
        email: novoUsuario.rows[0].email 
      },
      process.env.JWT_SECRETO,
      { expiresIn: process.env.JWT_EXPIRA_EM }
    );

    // aqui retorna os dados do usuário criado (sem a senha)
    res.status(201).json({
      mensagem: 'Usuário criado com sucesso!',
      token,
      usuario: {
        id: novoUsuario.rows[0].id,
        nome: novoUsuario.rows[0].nome,
        email: novoUsuario.rows[0].email,
        idEstudante: novoUsuario.rows[0].id_estudante,
        maxEmprestimos: novoUsuario.rows[0].max_emprestimos,
        criadoEm: novoUsuario.rows[0].criado_em
      }
    });

  } catch (erro) {
    // Log do erro para debugar codigo
    console.error('Erro ao registrar usuário:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível criar o usuário'
    });
  }
}

// essa é a função para fazer login ou seja aq é onde autentica o usuario
async function fazerLogin(req, res) {
  try {
    const { email, senha } = req.body;

    // validações básicas
    if (!email || !senha) {
      return res.status(400).json({
        erro: 'Dados incompletos',
        mensagem: 'Email e senha são obrigatórios'
      });
    }

    // aqui busca o usuário no banco de dados pelo email
    const usuario = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    // Se não encontrou usuário com este email ele retorna erro
    if (usuario.rows.length === 0) {
      return res.status(401).json({
        erro: 'Credenciais inválidas',
        mensagem: 'Email ou senha incorretos'
      });
    }

    // aqui verifica se a senha fornecida confere com a senha criptografada
    const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'Credenciais inválidas',
        mensagem: 'Email ou senha incorretos'
      });
    }

    // aqui gera um novo token JWT para o usuário
    const token = jwt.sign(
      { 
        id: usuario.rows[0].id,
        email: usuario.rows[0].email 
      },
      process.env.JWT_SECRETO,
      { expiresIn: process.env.JWT_EXPIRA_EM }
    );

    // retorna os dados do usuário logado (sem a senha)
    res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.rows[0].id,
        nome: usuario.rows[0].nome,
        email: usuario.rows[0].email,
        idEstudante: usuario.rows[0].id_estudante,
        maxEmprestimos: usuario.rows[0].max_emprestimos
      }
    });

  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível fazer o login'
    });
  }
}

// essa é a função para obter dados do perfil do usuário logado
async function obterPerfil(req, res) {
  try {
    // req.usuario vem do middleware de autenticação
    const usuario = await pool.query(
      'SELECT id, nome, email, id_estudante, max_emprestimos, criado_em FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        erro: 'Usuário não encontrado',
        mensagem: 'Usuário não existe'
      });
    }

    // aqui conta quantos empréstimos ativos o usuário tem
    const emprestimosAtivos = await pool.query(
      'SELECT COUNT(*) FROM emprestimos WHERE usuario_id = $1 AND status = $2',
      [req.usuario.id, 'ativo']
    );

    const dadosUsuario = usuario.rows[0];

    res.json({
      usuario: {
        id: dadosUsuario.id,
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        idEstudante: dadosUsuario.id_estudante,
        maxEmprestimos: dadosUsuario.max_emprestimos,
        emprestimosAtivos: parseInt(emprestimosAtivos.rows[0].count),
        criadoEm: dadosUsuario.criado_em
      }
    });

  } catch (erro) {
    console.error('Erro ao obter perfil:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível obter o perfil'
    });
  }
}

// aqui exporta as funções para uso nas rotas
module.exports = {
  registrarUsuario,
  fazerLogin,
  obterPerfil
};