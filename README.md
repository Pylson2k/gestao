# SINAI ENGENHARIA — Gestão de Orçamentos

Sistema completo para criação e gestão de orçamentos profissionais (SINAI ENGENHARIA), com integração ao WhatsApp e geração de PDFs personalizados.

## 🚀 Funcionalidades

- ✅ Autenticação segura com hash de senha
- ✅ Gestão completa de orçamentos (CRUD)
- ✅ Personalização da empresa (logo, dados)
- ✅ Geração de PDFs personalizados
- ✅ Integração com WhatsApp
- ✅ Dashboard com estatísticas
- ✅ Histórico com filtros avançados
- ✅ Banco de dados PostgreSQL com Prisma

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/Pylson2k/gestao.git
cd gestao
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**

Crie um arquivo `.env` na raiz do projeto:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sinai_engenharia?schema=public"
```

Substitua `usuario`, `senha` e o nome do banco pelos seus dados do PostgreSQL.

4. **Configure o Prisma**
```bash
# Gerar o cliente Prisma
npm run db:generate

# Criar as tabelas no banco
npm run db:push

# (Opcional) Popular com dados iniciais
npm run db:seed
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

## 👤 Usuários Padrão

Após executar o seed, haverá um único usuário:

- **Usuário:** `gustavo` | **Senha:** `gustavo123`

⚠️ **Importante:** Você será obrigado a alterar a senha no primeiro login. Apenas `gustavo` pode acessar o sistema.

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/              # API Routes
│   │   ├── auth/         # Autenticação
│   │   ├── quotes/       # Orçamentos
│   │   └── company/      # Configurações da empresa
│   ├── dashboard/        # Páginas do dashboard
│   └── (auth)/          # Páginas de autenticação
├── components/           # Componentes React
├── contexts/             # Contextos React (Auth, Quotes, Company)
├── lib/                  # Utilitários e helpers
├── prisma/               # Schema e migrations do Prisma
└── public/               # Arquivos estáticos
```

## 🗄️ Banco de Dados

O sistema usa Prisma ORM com PostgreSQL. O schema inclui:

- **User** - Usuários do sistema
- **Client** - Clientes
- **Quote** - Orçamentos
- **ServiceItem** - Itens de serviço
- **MaterialItem** - Itens de material
- **CompanySettings** - Configurações da empresa

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Inicia servidor de produção
- `npm run db:generate` - Gera cliente Prisma
- `npm run db:push` - Aplica schema ao banco
- `npm run db:migrate` - Cria migration
- `npm run db:seed` - Popula banco com dados iniciais
- `npm run db:test` - Testa conexão com o banco
- `npm run db:setup` - Setup completo do banco

## 📝 Notas Importantes

- Todos os dados são armazenados no banco de dados PostgreSQL
- Senhas são hasheadas com bcrypt
- O sistema não usa mais localStorage ou dados mock
- As configurações da empresa são salvas por usuário
- Cada usuário só vê seus próprios orçamentos

## 🚀 Deploy

Para fazer deploy em produção:

1. Configure a variável `DATABASE_URL` no ambiente de produção
2. Execute `npm run build`
3. Execute `npm run db:push` para criar as tabelas
4. Execute `npm run db:seed` para criar usuários iniciais (opcional)
5. Inicie com `npm start`

## 📄 Licença

Este projeto é privado e de uso restrito.
