// Importei o express router para criar rotas modulares
const express = require('express');
const router = express.Router();

// aqui importei as funções do controller de autenticação
const {
  registrarUsuario,
  fazerLogin,
  obterPerfil
} = require('../controllers/autenticacao');

// aqui importei o middleware de autenticação
const { verificarToken } = require('../middleware/autenticacao');

// Rota para registrar um novo usuário
// POST /api/auth/register
// Não precisa de autenticação pois é para criar conta
router.post('/register', registrarUsuario);

// rota pra fazer login
// POST /api/auth/login
// não precisa de autenticação pois é so para obter o token
router.post('/login', fazerLogin);

// rota pra obter perfil do usuário logado
// GET /api/auth/profile
// Precisa de autenticação - middleware verificarToken é executado antes
router.get('/profile', verificarToken, obterPerfil);

// aqui exporta o router para uso no servidor principal
module.exports = router;