// aqui importei o express router
const express = require('express');
const router = express.Router();

// aqui importa as funções do controller de livros
const {
  listarLivros,
  obterLivro,
  adicionarLivro
} = require('../controllers/livros');

// aqui importa o middleware de autenticação
const { verificarToken } = require('../middleware/autenticacao');

// essa aqui é a rota para listar todos os livros com filtros opcionais
// GET /api/books
// Exemplos de como usa ele:
// GET /api/books - lista todos os livros
// GET /api/books?categoria=tecnologia - filtra por categoria
// GET /api/books?disponivel=true - apenas livros disponíveis
// GET /api/books?autor=Maria&titulo=Aventuras - filtros combinados

router.get('/', listarLivros);

// essa aqui é a rota para ter detalhes de um livro específico
// GET /api/books/:id
// Exemplo: GET /api/books/1

router.get('/:id', obterLivro);

// rota para adicionar um  livro novo
// POST /api/books
// aqui vai precisa de autenticação - apenas usuários logados vao podem adicionar livros
router.post('/', verificarToken, adicionarLivro);


module.exports = router;