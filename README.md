INSTALAÇÃO:
bashgit clone https://github.com/DornelassDev/Sistema-de-gerenciamento-de-emprestimos-de-livros.git
cd Sistema-de-gerenciamento-de-emprestimos-de-livros
npm install

CONFIGURAÇÃO DO BANCO DE DADOS:
bashpsql -U postgres
CREATE DATABASE bibliotecamalu;
\q

INICIALIZAÇÃO:
bashnpm start
