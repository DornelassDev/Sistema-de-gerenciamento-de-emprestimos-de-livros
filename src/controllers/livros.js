// Importei a conexão com o banco de dados
const pool = require('../config/database');

// fiz uma função para listar todos os livros com filtros opcionais
async function listarLivros(req, res) {
  try {
    
    const { categoria, autor, titulo, disponivel } = req.query;
    
    // aqui monta a query SQL base
    let query = `
      SELECT 
        id, 
        titulo, 
        autor, 
        isbn, 
        total_exemplares, 
        exemplares_disponiveis, 
        categoria, 
        criado_em 
      FROM livros 
      WHERE 1=1
    `;
    
    // fiz o array para armazenar os parâmetros da query
    const parametros = [];
    let contadorParametros = 0;

    // aqui adiciona filtros dinamicamente conforme os parâmetros recebidos
    if (categoria) {
      contadorParametros++;
      query += ` AND categoria ILIKE $${contadorParametros}`;
      // ILIKE é case-insensitive no PostgreSQL
      parametros.push(`%${categoria}%`);
    }

    if (autor) {
      contadorParametros++;
      query += ` AND autor ILIKE $${contadorParametros}`;
      parametros.push(`%${autor}%`);
    }

    if (titulo) {
      contadorParametros++;
      query += ` AND titulo ILIKE $${contadorParametros}`;
      parametros.push(`%${titulo}%`);
    }

    // Filtro especial 
    if (disponivel === 'true') {
      query += ` AND exemplares_disponiveis > 0`;
    } else if (disponivel === 'false') {
      query += ` AND exemplares_disponiveis = 0`;
    }

    // aqui ordena os resultados por título
    query += ` ORDER BY titulo ASC`;

    // aqui executa a query no banco de dados
    const resultado = await pool.query(query, parametros);

    // aqui formata os dados para o padrão da API (nomes em inglês)
    const livros = resultado.rows.map(livro => ({
      id: livro.id,
      title: livro.titulo,
      author: livro.autor,
      isbn: livro.isbn,
      totalCopies: livro.total_exemplares,
      availableCopies: livro.exemplares_disponiveis,
      category: livro.categoria,
      createdAt: livro.criado_em
    }));

    res.json({
      livros,
      total: livros.length,
      filtros: {
        categoria: categoria || null,
        autor: autor || null,
        titulo: titulo || null,
        disponivel: disponivel || null
      }
    });

  } catch (erro) {
    console.error('Erro ao listar livros:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível listar os livros'
    });
  }
}

// fiz a função para obter detalhes de um livro específico
async function obterLivro(req, res) {
  try {
    // aqui obtém o id do livro dos parâmetros da URL
    const { id } = req.params;

    // aqui valida se o id é um número
    if (isNaN(id)) {
      return res.status(400).json({
        erro: 'ID inválido',
        mensagem: 'O ID do livro deve ser um número'
      });
    }

    // aqui busca o livro no banco de dados
    const resultado = await pool.query(
      'SELECT * FROM livros WHERE id = $1',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Livro não encontrado',
        mensagem: 'Não existe um livro com este ID'
      });
    }

    const livro = resultado.rows[0];

    // aqui busca os empréstimos ativos deste livro para mostrar quem está com ele
    const emprestimosAtivos = await pool.query(`
      SELECT 
        e.id,
        e.data_emprestimo,
        e.data_vencimento,
        u.nome as nome_usuario,
        u.id_estudante
      FROM emprestimos e
      JOIN usuarios u ON e.usuario_id = u.id
      WHERE e.livro_id = $1 AND e.status = 'ativo'
      ORDER BY e.data_emprestimo DESC
    `, [id]);

    res.json({
      livro: {
        id: livro.id,
        title: livro.titulo,
        author: livro.autor,
        isbn: livro.isbn,
        totalCopies: livro.total_exemplares,
        availableCopies: livro.exemplares_disponiveis,
        category: livro.categoria,
        createdAt: livro.criado_em
      },
      emprestimosAtivos: emprestimosAtivos.rows.map(emp => ({
        id: emp.id,
        dataEmprestimo: emp.data_emprestimo,
        dataVencimento: emp.data_vencimento,
        nomeUsuario: emp.nome_usuario,
        idEstudante: emp.id_estudante
      }))
    });

  } catch (erro) {
    console.error('Erro ao obter livro:', erro);
    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível obter os detalhes do livro'
    });
  }
}

// aqui fiz a função para adicionar um novo livro ao sistema
async function adicionarLivro(req, res) {
  try {
    const { titulo, autor, isbn, totalExemplares, categoria } = req.body;

    // aqui ele valida os dados de entrada
    if (!titulo || titulo.trim().length < 2) {
      return res.status(400).json({
        erro: 'Título inválido',
        mensagem: 'O título deve ter pelo menos 2 caracteres'
      });
    }

    if (!autor || autor.trim().length < 2) {
      return res.status(400).json({
        erro: 'Autor inválido',
        mensagem: 'O autor deve ter pelo menos 2 caracteres'
      });
    }

    if (!isbn || isbn.trim().length === 0) {
      return res.status(400).json({
        erro: 'ISBN obrigatório',
        mensagem: 'O ISBN é obrigatório'
      });
    }

    // aqui ele define quantidade padrão de exemplares
    const exemplares = totalExemplares || 1;
    if (exemplares < 1) {
      return res.status(400).json({
        erro: 'Quantidade inválida',
        mensagem: 'O número de exemplares deve ser pelo menos 1'
      });
    }

    // aqui verifica se já existe um livro com este ISBN
    const isbnExistente = await pool.query(
      'SELECT id FROM livros WHERE isbn = $1',
      [isbn]
    );

    if (isbnExistente.rows.length > 0) {
      return res.status(400).json({
        erro: 'ISBN já cadastrado',
        mensagem: 'Já existe um livro com este ISBN'
      });
    }

    // aqui ele insere o novo livro no banco de dados
    
    const novoLivro = await pool.query(`
      INSERT INTO livros (titulo, autor, isbn, total_exemplares, exemplares_disponiveis, categoria)
      VALUES ($1, $2, $3, $4, $4, $5)
      RETURNING *
    `, [titulo.trim(), autor.trim(), isbn.trim(), exemplares, categoria?.trim() || null]);

    const livro = novoLivro.rows[0];

    res.status(201).json({
      mensagem: 'Livro adicionado com sucesso!',
      livro: {
        id: livro.id,
        title: livro.titulo,
        author: livro.autor,
        isbn: livro.isbn,
        totalCopies: livro.total_exemplares,
        availableCopies: livro.exemplares_disponiveis,
        category: livro.categoria,
        createdAt: livro.criado_em
      }
    });

  } catch (erro) {
    console.error('Erro ao adicionar livro:', erro);
    
    // aqui ele trata erro específico de ISBN duplicado caso passe pela validação
    if (erro.code === '23505' && erro.constraint === 'livros_isbn_key') {
      return res.status(400).json({
        erro: 'ISBN já cadastrado',
        mensagem: 'Já existe um livro com este ISBN'
      });
    }

    res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: 'Não foi possível adicionar o livro'
    });
  }
}

// por fim exporta as funções para uso nas rotas
module.exports = {
  listarLivros,
  obterLivro,
  adicionarLivro
};