// Importei a biblioteca JWT para trabalhar com tokens de autenticação
const jwt = require('jsonwebtoken');

// Middleware é uma função que executa entre a requisição e a resposta
// Este middleware verifica se o usuário está autenticado
function verificarToken(req, res, next) {
  // aquo
  // aqui ele obtém o cabeçalho Authorization da requisição
  const cabecalhoAutorizacao = req.headers.authorization;
  
  // aqui ele verifica se o token foi enviado na requisição
  if (!cabecalhoAutorizacao) {
    return res.status(401).json({ 
      erro: 'Token não fornecido',
      mensagem: 'Você precisa estar logado para acessar esta funcionalidade'
    });
  }

  // aqui ele extrai o token do cabeçalho
  // O formato esperado é "Bearer e o token dps
  const token = cabecalhoAutorizacao.startsWith('Bearer ') 
    ? cabecalhoAutorizacao.slice(7) // aqui remove "Bearer " do início
    : cabecalhoAutorizacao;

  try {
    // aqui verifica se o token é válido usando a chave secreta
    const tokenDecodificado = jwt.verify(token, process.env.JWT_SECRETO);
    
    // aqui adiciona os dados do usuário decodificados na requisição
    // Assim outros middlewares e rotas podem acessar req.usuario
    req.usuario = tokenDecodificado;
    
    // aqui chama a próxima função na cadeia de middlewares
    next();
  } catch (erro) {
    // Se o token for inválido ou expirado da erro
    return res.status(401).json({
      erro: 'Token inválido',
      mensagem: 'Seu token expirou ou é inválido. Faça login novamente.'
    });
  }
}

// aqui exporta o middleware para uso em outros arquivos
module.exports = { verificarToken };