// aqui importei as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// aqui vai carregar as variáveis de ambiente do arquivo .env
dotenv.config();

// aqui importa os módulos de rotas
const rotasAutenticacao = require('./routes/autenticacao');
const rotasLivros = require('./routes/livros');
const rotasEmprestimos = require('./routes/emprestimos');

// aqui vai criar a aplicação Express
const app = express();

// Config de middlewares globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// essa aqui é a configuração das rotas da api 
app.use('/api/auth', rotasAutenticacao);
app.use('/api/books', rotasLivros);
app.use('/api/loans', rotasEmprestimos);

// essa aqui é a rota principal para testar se a api está funcionando 
app.get('/', (req, res) => {
  res.json({ 
    mensagem: 'API da Biblioteca da Malu está funcionando!',
    versao: '1.0.0',
    horario: new Date().toLocaleString('pt-BR'),
    endpoints: {
      autenticacao: '/api/auth',
      livros: '/api/books',
      emprestimos: '/api/loans'
    }
  });
});

//aqui coloquei middleware para capturar rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    erro: 'Rota não encontrada',
    mensagem: 'A rota solicitada não existe nesta API',
    sugestao: 'Verifique a documentação para rotas válidas'
  });
});

// aqui criei um middleware global para tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.message);
  res.status(500).json({ 
    erro: 'Erro interno do servidor',
    mensagem: 'Algo deu errado no servidor'
  });
});

// aqui define a porta do servidor
const porta = process.env.PORTA || 3000;

// por fim aqui inicia o servidor HTTP
app.listen(porta, () => {
  console.log(`Servidor rodando na porta ${porta}`);
  console.log(`API da Biblioteca da Malu iniciada com sucesso`);
  console.log(`Acesse: http://localhost:${porta}`);
  console.log(`Ambiente: ${process.env.AMBIENTE || 'desenvolvimento'}`);
});


module.exports = app;