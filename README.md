# MegaTech

O MegaTech é um sistema web desenvolvido para auxiliar no controle de estoque e vendas de uma empresa.

O objetivo do projeto é facilitar o cadastro de produtos, acompanhamento do estoque, registro de vendas e gerenciamento dos usuários que possuem acesso ao sistema.

## Funcionalidades

O sistema possui:

- Login de usuários
- Cadastro e gerenciamento de produtos
- Controle de estoque
- Registro de vendas
- Histórico de movimentações
- Gerenciamento de usuários
- Diferentes níveis de acesso
- Dashboard com informações do sistema

## Tecnologias utilizadas

O projeto utiliza:

- React
- TypeScript
- Vite
- Supabase
- PostgreSQL
- Git e GitHub

## Banco de dados

O banco de dados é gerenciado pelo Supabase.

Entre as principais tabelas estão:

- `profiles` - informações dos usuários
- `user_roles` - nível de acesso dos usuários
- `products` - produtos cadastrados
- `categories` - categorias dos produtos
- `sales` - vendas realizadas
- `sale_items` - produtos presentes em cada venda
- `stock_movements` - movimentações do estoque

## Controle de acesso

O sistema possui diferentes tipos de usuários, permitindo controlar quais funções cada usuário pode acessar.

Também são utilizadas políticas de segurança do Supabase para controlar o acesso aos dados.

## Objetivo

O MegaTech foi desenvolvido como projeto escolar com o objetivo de aplicar conhecimentos de desenvolvimento web, banco de dados e organização de sistemas.
