// Importei a conexão com o banco de dados
const pool = require('../config/database');

// criei a função para criar um novo empréstimo
async function criarEmprestimo(req, res) {
  try {
    const { livroId } = req.body;
    //o usuarioId vem do middleware de autenticação que decodifica o token
    const usuarioId = req.usuario.id;

    // aqui valida o ID do livro
    if (!livroId || isNaN(livroId)) {
      return res.status(400).json({
        erro: 'ID do livro inválido',
        mensagem: 'O ID do livro deve ser um número válido'
      });
    }

    // aqui verifica se o livro existe no banco de dados
    const livro = await pool.query(
      'SELECT * FROM livros WHERE id = $1',
      [livroId]
    );

    if (livro.rows.length === 0) {
      return res.status(404).json({
        erro: 'Livro não encontrado',
        mensagem: 'Não existe um livro com este ID'
      });
    }

    // aqui verifica se o livro tem exemplares disponíveis
    if (livro.rows[0].exemplares_disponiveis <= 0) {
      return res.status(400).json({
        erro: 'Livro indisponível',
        mensagem: 'Este livro não possui exemplares disponíveis'
      });
    }

    // aqui busca os dados do usuário para verificar limite de empréstimos
    const usuario = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        erro: 'Usuário não encontrado',
        mensagem: 'Usuário não existe'
      });
    }

    // aqui conta quantos empréstimos ativos o usuário já tem
    const emprestimosAtivos = await pool.query(
      'SELECT COUNT(*) FROM emprestimos WHERE usuario_id = $1 AND status = $2',
      [usuarioId, 'ativo']
    );

    const quantidadeEmprestimos = parseInt(emprestimosAtivos.rows[0].count);
    const limiteEmprestimos = usuario.rows[0].max_emprestimos;

    // aqui verifica se o usuário já atingiu o limite de empréstimos 
    if (quantidadeEmprestimos >= limiteEmprestimos) {
      return res.status(400).json({
        erro: 'Limite de empréstimos atingido',
        mensagem: `Você já possui ${quantidadeEmprestimos} empréstimos ativos. Limite máximo: ${limiteEmprestimos}`
      });
    }

    // aqui verifica se o usuário já tem o livro emprestado
    const emprestimoExistente = await pool.query(
      'SELECT id FROM emprestimos WHERE usuario_id = $1 AND livro_id = $2 AND status = $3',
      [usuarioId, livroId, 'ativo']
    );

    if (emprestimoExistente.rows.length > 0) {
      return res.status(400).json({
        erro: 'Livro já emprestado',
        mensagem: 'Você já possui este livro emprestado'
      });
    }

    // aqui calcula as datas do empréstimo
    const dataEmprestimo = new Date();
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 14); // 14 dias de prazo

    // aqui inicia uma transação para garantir consistência dos dados
    // Se qualquer operação falhar, todas são desfeitas pra n da ruim
    await pool.query('BEGIN');

    try {
      // aqui cria o registro de empréstimo
      const novoEmprestimo = await pool.query(`
        INSERT INTO emprestimos (usuario_id, livro_id, data_emprestimo, data_vencimento, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [usuarioId, livroId, dataEmprestimo, dataVencimento, 'ativo']);

      // aqui diminui a quantidade de exemplares disponíveis
      await pool.query(
        'UPDATE livros SET exemplares_disponiveis = exemplares_disponiveis - 1 WHERE id = $1',
        [livroId]
      );

      // aqui confirma todas as operações da transação
      await pool.query('COMMIT');

      const emprestimo = novoEmprestimo.rows[0];

      res.status(201).json({
        mensagem: 'Empréstimo realizado com sucesso!',
        emprestimo: {
          id: emprestimo.id,
          userId: emprestimo.usuario_id,
          bookId: emprestimo.livro_id,
          loanDate: emprestimo.data_emprestimo,
          dueDate: emprestimo.data_vencimento,
          returnDate: emprestimo.data_devolucao,
          status: emprestimo.status
        },
        livro: {
          id: livro.rows[0].id,
          title: livro.rows[0].titulo,
          author: livro.rows[0].autor
        }
      });

    } catch (erro) {
      // aqui desfaz todas as operações em caso de erro como dito acima
      await pool.query('ROLLBACK');
      throw erro;
    }

  } catch (erro) {
    console.error('Erro ao criar empréstimo:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível realizar o empréstimo'
    });
  }
}

// aqui criei uma função para listar empréstimos do usuário logado
async function listarEmprestimos(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { status, pagina = 1, limite = 10 } = req.query;

    // aqui faz o cálculo para paginação
    const offset = (pagina - 1) * limite;

    //aqui Monta a query para buscar empréstimos com dados do livro
    let query = `
      SELECT 
        e.id,
        e.usuario_id,
        e.livro_id,
        e.data_emprestimo,
        e.data_vencimento,
        e.data_devolucao,
        e.status,
        l.titulo,
        l.autor,
        l.isbn,
        l.categoria
      FROM emprestimos e
      JOIN livros l ON e.livro_id = l.id
      WHERE e.usuario_id = $1
    `;

    const parametros = [usuarioId];
    let contadorParametros = 1;

    // aqui adiciona filtro por statusse o usuário passar o parâmetro 
    if (status && ['ativo', 'devolvido'].includes(status)) {
      contadorParametros++;
      query += ` AND e.status = $${contadorParametros}`;
      parametros.push(status);
    }

    // aqui ordena por data de empréstimo mais recente primeiro
    query += ` ORDER BY e.data_emprestimo DESC`;

    // aqui adiciona paginação
    query += ` LIMIT $${contadorParametros + 1} OFFSET $${contadorParametros + 2}`;
    parametros.push(limite, offset);

    // aqui executa a query
    const resultado = await pool.query(query, parametros);

    // coloquei a query para contar total de empréstimos (para paginação)
    let queryTotal = `
      SELECT COUNT(*) 
      FROM emprestimos e
      WHERE e.usuario_id = $1
    `;
    const parametrosTotal = [usuarioId];

    if (status && ['ativo', 'devolvido'].includes(status)) {
      queryTotal += ` AND e.status = $2`;
      parametrosTotal.push(status);
    }

    const totalResultado = await pool.query(queryTotal, parametrosTotal);
    const total = parseInt(totalResultado.rows[0].count);

    // aqui formata os dados dos empréstimos
    const emprestimos = resultado.rows.map(emp => {
      const agora = new Date();
      const dataVencimento = new Date(emp.data_vencimento);
      const estaAtrasado = emp.status === 'ativo' && agora > dataVencimento;

      return {
        id: emp.id,
        userId: emp.usuario_id,
        bookId: emp.livro_id,
        loanDate: emp.data_emprestimo,
        dueDate: emp.data_vencimento,
        returnDate: emp.data_devolucao,
        status: emp.status,
        atrasado: estaAtrasado,
        diasAtraso: estaAtrasado ? Math.ceil((agora - dataVencimento) / (1000 * 60 * 60 * 24)) : 0,
        livro: {
          id: emp.livro_id,
          titulo: emp.titulo,
          autor: emp.autor,
          isbn: emp.isbn,
          categoria: emp.categoria
        }
      };
    });

    res.json({
      emprestimos,
      paginacao: {
        paginaAtual: parseInt(pagina),
        totalPaginas: Math.ceil(total / limite),
        totalItens: total,
        itensPorPagina: parseInt(limite)
      },
      resumo: {
        total: total,
        ativos: emprestimos.filter(e => e.status === 'ativo').length,
        devolvidos: emprestimos.filter(e => e.status === 'devolvido').length,
        atrasados: emprestimos.filter(e => e.atrasado).length
      }
    });

  } catch (erro) {
    console.error('Erro ao listar empréstimos:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível listar os empréstimos'
    });
  }
}

// fiz a função para devolver um livro emprestado
async function devolverLivro(req, res) {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario.id;

    // aqui valida se o ID do empréstimo é um número
    if (isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido',
        mensagem: 'O ID do empréstimo deve ser um número'
      });
    }

    // aqui busca o empréstimo com dados do livro
    const emprestimo = await pool.query(`
      SELECT e.*, l.titulo, l.autor
      FROM emprestimos e
      JOIN livros l ON e.livro_id = l.id
      WHERE e.id = $1 AND e.usuario_id = $2
    `, [id, usuarioId]);

    if (emprestimo.rows.length === 0) {
      return res.status(404).json({
        erro: 'Empréstimo não encontrado',
        mensagem: 'Não existe um empréstimo com este ID para este usuário'
      });
    }

    const dadosEmprestimo = emprestimo.rows[0];

    // aqui verifica se o livro já foi devolvido
    if (dadosEmprestimo.status === 'devolvido') {
      return res.status(400).json({
        erro: 'Livro já devolvido',
        mensagem: 'Este livro já foi devolvido anteriormente'
      });
    }

    // aqui ja Inicia transação para devolução
    await pool.query('BEGIN');

    try {
      // ai atualiza o empréstimo com data de devolução
      const dataDevolucao = new Date();
      await pool.query(
        'UPDATE emprestimos SET data_devolucao = $1, status = $2 WHERE id = $3',
        [dataDevolucao, 'devolvido', id]
      );

      // aqui aumenta a quantidade de exemplares disponíveis
      await pool.query(
        'UPDATE livros SET exemplares_disponiveis = exemplares_disponiveis + 1 WHERE id = $1',
        [dadosEmprestimo.livro_id]
      );

      // aqui confirma a transação
      await pool.query('COMMIT');

      // aqui calcula se a devolução foi atrasada
      const agora = new Date();
      const dataVencimento = new Date(dadosEmprestimo.data_vencimento);
      const estaAtrasado = agora > dataVencimento;
      const diasAtraso = estaAtrasado ? Math.ceil((agora - dataVencimento) / (1000 * 60 * 60 * 24)) : 0;

      res.json({
        mensagem: 'Livro devolvido com sucesso!',
        emprestimo: {
          id: dadosEmprestimo.id,
          userId: dadosEmprestimo.usuario_id,
          bookId: dadosEmprestimo.livro_id,
          loanDate: dadosEmprestimo.data_emprestimo,
          dueDate: dadosEmprestimo.data_vencimento,
          returnDate: dataDevolucao,
          status: 'devolvido',
          estaAtrasado: estaAtrasado,
          diasAtraso: diasAtraso
        },
        livro: {
          titulo: dadosEmprestimo.titulo,
          autor: dadosEmprestimo.autor
        }
      });

    } catch (erro) {
      // aqui desfaz a transação em caso de erro
      await pool.query('ROLLBACK');
      throw erro;
    }

  } catch (erro) {
    console.error('Erro ao devolver livro:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível devolver o livro'
    });
  }
}

// aqui exporta as funções para uso nas rotas
module.exports = {
  criarEmprestimo,
  listarEmprestimos,
  devolverLivro
};