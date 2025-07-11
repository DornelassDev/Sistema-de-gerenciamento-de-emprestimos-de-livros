// Aqui importei as bibliotecas para fazer os testes
const request = require('supertest');
const app = require('../src/server');

// Aqui criei variáveis para guardar dados durante os testes
let tokenUsuario;
let idUsuario;
let idLivro;
let idEmprestimo;

// aqui fiz o servidor esperar um pouco antes dos testes começarem
beforeAll(async () => {
  // aqui coloquei um leve delay porque o banco demora para conectar
  await new Promise(resolve => setTimeout(resolve, 2000));
});


afterAll(async () => {
  
});

// aqui testei todas as funcionalidades de login e cadastro
describe('Testes de Autenticação', () => {
  
  // aqui testei se consigo registrar um usuário novo
  test('Deve registrar um novo usuário com sucesso', async () => {
    // aqui defini os dados do usuário que vou criar
    const novoUsuario = {
      nome: 'João Silva Teste',
      email: 'joao.teste@email.com',
      senha: '123456',
      idEstudante: 'EST001'
    };

    // aqui fiz a requisição para criar o usuário
    const resposta = await request(app)
      .post('/api/auth/register')
      .send(novoUsuario)
      .expect(201);

    // aqui verifiquei se a resposta está correta
    expect(resposta.body.mensagem).toBe('Usuário criado com sucesso!');
    expect(resposta.body.token).toBeDefined();
    expect(resposta.body.usuario.nome).toBe(novoUsuario.nome);
    expect(resposta.body.usuario.email).toBe(novoUsuario.email);
    expect(resposta.body.usuario.idEstudante).toBe(novoUsuario.idEstudante);

    // nessa parte eu salvo o token e ID para usar nos próximos testes
    tokenUsuario = resposta.body.token;
    idUsuario = resposta.body.usuario.id;
  });

  // nessa parte testo se o login funciona 
  test('Deve fazer login com credenciais válidas', async () => {
    // Aqui defino os dados para fazer login
    const dadosLogin = {
      email: 'joao.teste@email.com',
      senha: '123456'
    };

    // aqui faço a requisição de login
    const resposta = await request(app)
      .post('/api/auth/login')
      .send(dadosLogin)
      .expect(200);

    // aqui consigo ver se o login funcionou
    expect(resposta.body.mensagem).toBe('Login realizado com sucesso!');
    expect(resposta.body.token).toBeDefined();
    expect(resposta.body.usuario.email).toBe(dadosLogin.email);
  });

  // aqui testo se consigo ver o perfil do usuário logado
  test('Deve obter perfil do usuário logado', async () => {
    // aqui faço requisição para ver o perfil usando o token
    const resposta = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .expect(200);

    //  verifico se os dados do perfil estão corretos
    expect(resposta.body.usuario.id).toBe(idUsuario);
    expect(resposta.body.usuario.nome).toBe('João Silva Teste');
    expect(resposta.body.usuario.email).toBe('joao.teste@email.com');
  });

  // nessa parte testo se a segurança funciona quando não tem token
  test('Deve retornar erro ao acessar perfil sem token', async () => {
    // qui tento acessar o perfil sem estar logado
    const resposta = await request(app)
      .get('/api/auth/profile')
      .expect(401);

    // aqui verifico se deu o erro esperado
    expect(resposta.body.erro).toBe('Token não fornecido');
  });
});

// aqui testo toda a parte de gerenciamento de livros
describe('Testes de Livros', () => {
  
  // aqui posso ver se consigo listar todos os livros
  test('Deve listar todos os livros', async () => {
    // aqui faço requisição para ver todos os livros
    const resposta = await request(app)
      .get('/api/books')
      .expect(200);

    // nessa parte se a lista de livros está correta
    expect(resposta.body.livros).toBeDefined();
    expect(Array.isArray(resposta.body.livros)).toBe(true);
    expect(resposta.body.total).toBeGreaterThan(0);
    
    // aqui pego o id do primeiro livro para usar depois
    if (resposta.body.livros.length > 0) {
      idLivro = resposta.body.livros[0].id;
    }
  });

  // aqui posso testar se consigo ver detalhes de um livro específico que eu quero
  test('Deve obter detalhes de um livro específico', async () => {
    // aqui consigo ver os detalhes do livro usando o id que salvei
    const resposta = await request(app)
      .get(`/api/books/${idLivro}`)
      .expect(200);

    // aqui vejo se os detalhes estão corretos
    expect(resposta.body.livro).toBeDefined();
    expect(resposta.body.livro.id).toBe(idLivro);
    expect(resposta.body.livro.title).toBeDefined();
    expect(resposta.body.livro.author).toBeDefined();
  });

  // aqui posso testa se consigo adicionar um livro novo
  test('Deve adicionar um novo livro', async () => {
    // aqui defino os dados do livro que vou adicionar
    const novoLivro = {
      titulo: 'Livro de Teste Automatizado',
      autor: 'Autor de Teste',
      isbn: '978-0000000000',
      totalExemplares: 2,
      categoria: 'teste'
    };

    // aqui faço a requisição para adicionar o livro
    const resposta = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send(novoLivro)
      .expect(201);

    // aqui verifico se o livro foi adicionado corretamente
    expect(resposta.body.mensagem).toBe('Livro adicionado com sucesso!');
    expect(resposta.body.livro.title).toBe(novoLivro.titulo);
    expect(resposta.body.livro.author).toBe(novoLivro.autor);
    expect(resposta.body.livro.isbn).toBe(novoLivro.isbn);
  });

  // Aqui testo se impede adicionar livro sem estar logado
  test('Deve retornar erro ao adicionar livro sem token', async () => {
    // Aqui defino dados de um livro mas não vou mandar token
    const novoLivro = {
      titulo: 'Livro Sem Token',
      autor: 'Autor Sem Token',
      isbn: '978-1111111111'
    };

    // aqui tento adicionar livro sem token
    const resposta = await request(app)
      .post('/api/books')
      .send(novoLivro)
      .expect(401);

    // aqui verifico se deu erro de falta de token
    expect(resposta.body.erro).toBe('Token não fornecido');
  });
});

// nessa parte testo a funcionalidade principal que é os empréstimos
describe('Testes de Empréstimos', () => {
  
  // aqui testo se consigo fazer um empréstimo de livro
  test('Deve criar um novo empréstimo', async () => {
    
    const dadosEmprestimo = {
      livroId: idLivro
    };

    // aqui faço a requisição para emprestar o livro
    const resposta = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send(dadosEmprestimo)
      .expect(201);

    // nessa parte verifico se o empréstimo foi criado de forma certa
    expect(resposta.body.mensagem).toBe('Empréstimo realizado com sucesso!');
    expect(resposta.body.emprestimo.bookId).toBe(idLivro);
    expect(resposta.body.emprestimo.userId).toBe(idUsuario);
    expect(resposta.body.emprestimo.status).toBe('ativo');

    
    idEmprestimo = resposta.body.emprestimo.id;
  });

  // aqui vejo se consigo ver a lista de empréstimos do usuário
  test('Deve listar empréstimos do usuário', async () => {
    // Aqui busco todos os empréstimos do usuário logado
    const resposta = await request(app)
      .get('/api/loans')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .expect(200);

    // nessa parte verifico se a lista está correta
    expect(resposta.body.emprestimos).toBeDefined();
    expect(Array.isArray(resposta.body.emprestimos)).toBe(true);
    expect(resposta.body.emprestimos.length).toBeGreaterThan(0);
    expect(resposta.body.resumo.total).toBeGreaterThan(0);
    expect(resposta.body.resumo.ativos).toBeGreaterThan(0);
  });

  // aqui testo se consigo devolver um livro emprestado
  test('Deve devolver um livro emprestado', async () => {
    
    const resposta = await request(app)
      .put(`/api/loans/${idEmprestimo}/return`)
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .expect(200);

    // Aqui verifico se a devolução funcionou
    expect(resposta.body.mensagem).toBe('Livro devolvido com sucesso!');
    expect(resposta.body.emprestimo.id).toBe(idEmprestimo);
    expect(resposta.body.emprestimo.status).toBe('devolvido');
    expect(resposta.body.emprestimo.returnDate).toBeDefined();
  });

  // aqui testo se impede emprestar sem estar logado
  test('Deve retornar erro ao emprestar livro sem token', async () => {
    
    const dadosEmprestimo = {
      livroId: idLivro
    };

    // aqui tento fazer empréstimo sem token
    const resposta = await request(app)
      .post('/api/loans')
      .send(dadosEmprestimo)
      .expect(401);

    
    expect(resposta.body.erro).toBe('Token não fornecido');
  });

  // aqui testo se valida quando tento emprestar livro que não existe
  test('Deve retornar erro ao emprestar livro inexistente', async () => {
    // Aqui uso um ID de livro que não existe no banco
    const dadosEmprestimo = {
      livroId: 99999
    };

    // aqui tento emprestar um livro inexistente
    const resposta = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send(dadosEmprestimo)
      .expect(404);

    // nessa parte verifico se deu o erro esperado
    expect(resposta.body.erro).toBe('Livro não encontrado');
  });
});

// aqui testo se as validações de dados estão funcionando
describe('Testes de Validação', () => {
  
  // testo se impede criar usuário com email inválido
  test('Deve retornar erro ao registrar usuário com email inválido', async () => {
    // Aqui defino dados com email inválido de propósito
    const usuarioInvalido = {
      nome: 'Usuário Teste',
      email: 'email-invalido',
      senha: '123456',
      idEstudante: 'EST002'
    };

    //  tento criar usuário com email inválido
    const resposta = await request(app)
      .post('/api/auth/register')
      .send(usuarioInvalido)
      .expect(400);

    // verifico se deu erro de email inválido
    expect(resposta.body.erro).toBe('Email inválido');
  });

  // testo se impede criar usuário com senha muito curta
  test('Deve retornar erro ao registrar usuário com senha curta', async () => {
    // Aqui defino dados com senha muito curta
    const usuarioInvalido = {
      nome: 'Usuário Teste',
      email: 'teste2@email.com',
      senha: '123',
      idEstudante: 'EST003'
    };

    // tento criar usuário com senha curta
    const resposta = await request(app)
      .post('/api/auth/register')
      .send(usuarioInvalido)
      .expect(400);

    // verifico se deu erro de senha inválida
    expect(resposta.body.erro).toBe('Senha inválida');
  });

  // testo se impede login com senha errada
  test('Deve retornar erro ao fazer login com credenciais inválidas', async () => {
    // aqui uso email certo mas senha errada
    const dadosLogin = {
      email: 'joao.teste@email.com',
      senha: 'senha-errada'
    };

    // tento fazer login com senha errada
    const resposta = await request(app)
      .post('/api/auth/login')
      .send(dadosLogin)
      .expect(401);

    //  verifico se deu erro de credenciais inválidas
    expect(resposta.body.erro).toBe('Credenciais inválidas');
  });
});

// testo algumas funcionalidades extras ex  filtros
describe('Testes de Funcionalidades Especiais', () => {
  
  // testo se consigo filtrar livros por categoria
  test('Deve filtrar livros por categoria', async () => {
    // busco livros só da categoria tecnologia
    const resposta = await request(app)
      .get('/api/books?categoria=tecnologia')
      .expect(200);

    // verifico se o filtro está funcionando
    expect(resposta.body.livros).toBeDefined();
    expect(resposta.body.filtros.categoria).toBe('tecnologia');
  });

  // testo se consigo filtrar só livros disponíveis
  test('Deve filtrar apenas livros disponíveis', async () => {
    // Aqui busco só livros que estão disponíveis
    const resposta = await request(app)
      .get('/api/books?disponivel=true')
      .expect(200);

    //verifico se só trouxe livros disponíveis
    expect(resposta.body.livros).toBeDefined();
    expect(resposta.body.filtros.disponivel).toBe('true');
    
    //verifico se todos os livros têm exemplares disponíveis
    resposta.body.livros.forEach(livro => {
      expect(livro.availableCopies).toBeGreaterThan(0);
    });
  });

  // testo se consigo filtrar empréstimos por status
  test('Deve filtrar empréstimos por status', async () => {
    // nessa parte busco só empréstimos que foram devolvidos
    const resposta = await request(app)
      .get('/api/loans?status=devolvido')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .expect(200);

    //verifico se só trouxe empréstimos devolvidos
    expect(resposta.body.emprestimos).toBeDefined();
    
    //verifico se todos estão realmente devolvidos
    resposta.body.emprestimos.forEach(emprestimo => {
      expect(emprestimo.status).toBe('devolvido');
    });
  });

  // testo se a rota principal da api funciona
  test('Deve retornar informações da API na rota principal', async () => {
    // essa aqui é a rota principal para ver se está funcionando
    const resposta = await request(app)
      .get('/')
      .expect(200);

    // verifico se as informações da api estão corretas
    expect(resposta.body.mensagem).toContain('API da Biblioteca da Malu');
    expect(resposta.body.versao).toBe('1.0.0');
    expect(resposta.body.horario).toBeDefined();
    expect(resposta.body.endpoints).toBeDefined();
  });
});

// testo se a api está respondendo rápido
describe('Testes de Performance', () => {
  
  //  testo se a listagem de livros é rápida
  test('Deve responder rapidamente ao listar livros', async () => {
    
    const inicioTempo = Date.now();
    
    // faço a requisição para listar livros
    await request(app)
      .get('/api/books')
      .expect(200);
    
    //calculo quanto tempo demorou
    const tempoResposta = Date.now() - inicioTempo;
    
    
    expect(tempoResposta).toBeLessThan(1000);
  });

  // nessa parte testo se o perfil também responde rápido
  test('Deve responder rapidamente ao obter perfil', async () => {
    
    const inicioTempo = Date.now();
    
    // e por fim aqui busco o perfil do usuário
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .expect(200);
    
   
    const tempoResposta = Date.now() - inicioTempo;
    
    
    expect(tempoResposta).toBeLessThan(1000);
  });
});