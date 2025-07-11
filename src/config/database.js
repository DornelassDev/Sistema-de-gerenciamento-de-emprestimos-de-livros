// Importei a biblioteca do PostgreSQL para conectar com banco de dados
const { Pool } = require('pg');

// Criei um pool de conexões com o banco usando as variáveis de ambiente
// Pool é mais eficiente...
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORTA || 5432,
  database: process.env.DB_NOME || 'bibliotecamalu',
  user: process.env.DB_USUARIO || 'postgres',
  password: process.env.DB_SENHA || 'postgres',
});

// essa é a função para testar se a conexão com o banco está funcionando
async function testarConexao() {
  try {
    // Tenta obter um cliente do pool de conexões
    const client = await pool.connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso');
    // Libera o cliente de volta para o pool
    client.release();
  } catch (erro) {
    console.error('Erro ao conectar com o banco de dados:', erro.message);
  }
}

// essa é a função para criar as tabelas necessárias se elas não existirem
async function criarTabelas() {
  try {
    // Cria tabela de usuários
    // SERIAL cria um campo auto-incremento
    // UNIQUE garante que não haverá valores duplicados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        id_estudante VARCHAR(50) UNIQUE NOT NULL,
        max_emprestimos INTEGER DEFAULT 2,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // aqui cria tabela de livros
    await pool.query(`
      CREATE TABLE IF NOT EXISTS livros (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        autor VARCHAR(100) NOT NULL,
        isbn VARCHAR(20) UNIQUE NOT NULL,
        total_exemplares INTEGER DEFAULT 1,
        exemplares_disponiveis INTEGER DEFAULT 1,
        categoria VARCHAR(50),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // aqui  cria tabela de empréstimos
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emprestimos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        livro_id INTEGER REFERENCES livros(id),
        data_emprestimo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_vencimento TIMESTAMP NOT NULL,
        data_devolucao TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ativo'
      )
    `);

    console.log('Tabelas criadas ou já existiam no banco de dados');
  } catch (erro) {
    console.error('Erro ao criar tabelas:', erro.message);
  }
}

// criei a funçao para inserir dados iniciais no banco (livros como exemplo)
async function inserirDadosIniciais() {
  try {
    // Verifica se já existem livros no banco
    const resultado = await pool.query('SELECT COUNT(*) FROM livros');
    const quantidadeLivros = parseInt(resultado.rows[0].count);

    // Se não há livros, insere alguns exemplos
    if (quantidadeLivros === 0) {
      await pool.query(`
        INSERT INTO livros (titulo, autor, isbn, total_exemplares, exemplares_disponiveis, categoria)
        VALUES 
          ('Férias sem fim', 'Estanislau Melo', '978-0123456789', 3, 3, 'turismo'),
          ('Aventuras na Programação', 'Maria Silva', '978-0987654321', 2, 2, 'tecnologia'),
          ('História do Brasil', 'João Santos', '978-1122334455', 4, 4, 'história'),
          ('Matemática Divertida', 'Ana Costa', '978-5566778899', 2, 2, 'educação'),
          ('Receitas da Vovó', 'Carmem Oliveira', '978-9988776655', 1, 1, 'culinária')
      `);
      console.log('Dados iniciais inseridos no banco de dados');
    } else {
      console.log('Dados já existem no banco de dados');
    }
  } catch (erro) {
    console.error('Erro ao inserir dados iniciais:', erro.message);
  }
}

// criei a funçao principal que inicializa o banco de dados
async function inicializarBanco() {
  await testarConexao();
  await criarTabelas();
  await inserirDadosIniciais();
}

//  aqui executa a inicialização quando esse arquivo é carregado
inicializarBanco();

// aqui exporta o pool de conexões para uso em outros arquivos
module.exports = pool;