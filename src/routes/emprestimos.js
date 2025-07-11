// importei o express router
const express = require('express');
const router = express.Router();

// aqui importa as funções do controller de empréstimos
const {
  criarEmprestimo,
  listarEmprestimos,
  devolverLivro
} = require('../controllers/emprestimos');

// aqui importa o middleware de autenticação
const { verificarToken } = require('../middleware/autenticacao');

// TODAAS as rotas de empréstimo precisam de autenticação
// Por isso apliquei o middleware verificarToken em todas
// Rota para criar um novo empréstimo
// POST /api/loans
router.post('/', verificarToken, criarEmprestimo);

// Rota para listar empréstimos do usuário logado
// GET /api/loans
// exemplo de como usa:
// GET /api/loans - lista todos os empréstimos do usuário
// GET /api/loans?status=ativo - apenas empréstimos ativos
// GET /api/loans?status=devolvido - apenas empréstimos devolvidos
// GET /api/loans?pagina=2&limite=5 - paginação
router.get('/', verificarToken, listarEmprestimos);

// rota para devolver um livro
// PUT /api/loans/:id/return
// Exemplo: PUT /api/loans/1/return
// O :id é o ID do empréstimo, não do livro
router.put('/:id/return', verificarToken, devolverLivro);

// exporta o router
module.exports = router;