# 🗄️ Guia Completo: Configurar Banco de Dados PostgreSQL

Este guia vai te ajudar a configurar um banco de dados PostgreSQL real e funcional para o sistema ServiPro.

## 📋 Pré-requisitos

- Node.js instalado
- npm ou yarn instalado
- Conta no Neon (gratuita) OU PostgreSQL local instalado

---

## 🚀 Opção 1: Banco de Dados na Nuvem (Neon) - RECOMENDADO

### Passo 1: Criar Banco de Dados Gratuito no Neon

### 1.1. Acesse o Neon
1. Abra: **https://neon.tech**
2. Clique em **"Sign Up"** (pode usar conta Google/GitHub)
3. Faça login

### 1.2. Criar Projeto
1. Clique em **"Create a project"**
2. Preencha:
   - **Project name:** `gestao` (ou qualquer nome)
   - **Region:** Escolha mais próximo (ex: `US East`)
   - **PostgreSQL version:** Deixe o padrão (15 ou 16)
3. Clique em **"Create project"**

### 1.3. Copiar Connection String
1. Na tela do projeto, você verá uma seção **"Connection string"**
2. Clique em **"Copy"** ao lado da connection string
3. Ela será algo como:
   ```
   postgresql://usuario:senha@ep-xxx-xxx.us-east-2.aws.neon.tech/gestao?sslmode=require
   ```
4. **GUARDE ESSA STRING!** Você vai precisar dela.

---

### Passo 2: Configurar Localmente (Desenvolvimento)

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione a seguinte linha (substitua pela sua connection string):
   ```env
   DATABASE_URL="postgresql://usuario:senha@ep-xxx-xxx.us-east-2.aws.neon.tech/gestao?sslmode=require"
   ```
3. Salve o arquivo

### Passo 3: Configurar no Vercel (Produção)

### 2.1. Acessar Configurações
1. Acesse: **https://vercel.com/dashboard**
2. Clique no seu projeto (gestao)
3. Clique em **"Settings"** (menu superior)
4. Clique em **"Environment Variables"** (menu lateral esquerdo)

### 2.2. Adicionar DATABASE_URL
1. Clique em **"Add New"**
2. Preencha:
   - **Key:** `DATABASE_URL`
   - **Value:** Cole a Connection String que você copiou do Neon
   - **Environment:** Marque todas (Production, Preview, Development)
3. Clique em **"Save"**

---

---

## 🖥️ Opção 2: Banco de Dados Local (PostgreSQL)

### Passo 1: Instalar PostgreSQL

**Windows:**
1. Baixe o instalador em: https://www.postgresql.org/download/windows/
2. Execute o instalador e siga as instruções
3. Anote a senha do usuário `postgres` que você configurou

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Passo 2: Criar Banco de Dados

1. Abra o terminal/command prompt
2. Conecte ao PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Crie o banco de dados:
   ```sql
   CREATE DATABASE servipro;
   ```
4. Saia do psql:
   ```sql
   \q
   ```

### Passo 3: Configurar Connection String

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione (ajuste conforme sua configuração):
   ```env
   DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/servipro"
   ```
3. Substitua `SUA_SENHA` pela senha do PostgreSQL
4. Salve o arquivo

---

## 📦 Passo 4: Instalar Dependências e Configurar

### 4.1. Instalar Dependências

```bash
npm install
```

### 4.2. Gerar Prisma Client

```bash
npm run db:generate
```

### 4.3. Criar as Tabelas no Banco

```bash
npm run db:push
```

Este comando vai:
- ✅ Criar todas as tabelas necessárias
- ✅ Configurar relacionamentos
- ✅ Aplicar índices e constraints

### 4.4. Criar Usuários Iniciais (Opcional)

```bash
npm run db:seed
```

Isso criará dois usuários de teste:
- **Usuário:** `gustavo` | **Senha:** `gustavo123`
- **Usuário:** `giovanni` | **Senha:** `giovanni123`

### 4.5. Testar Conexão

```bash
npx tsx scripts/test-database.ts
```

Este script vai:
- ✅ Verificar se a conexão está funcionando
- ✅ Listar todas as tabelas criadas
- ✅ Mostrar estatísticas do banco

---

## Passo 5: Verificar se Funcionou


## Passo 4: Verificar se Funcionou

### 5.1. Testar Localmente

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse: `http://localhost:3000/login`

3. Faça login com:
   - **Usuário:** `gustavo`
   - **Senha:** `gustavo123`

4. Se conseguir fazer login, o banco está funcionando! ✅

### 5.2. Verificar no Banco de Dados

**Neon (Nuvem):**
1. Acesse o **Neon Dashboard**
2. Clique em **"SQL Editor"**
3. Execute:
   ```sql
   SELECT * FROM users;
   ```
4. Deve aparecer os usuários criados!

**PostgreSQL Local:**
```bash
psql -U postgres -d servipro
```

Depois execute:
```sql
SELECT * FROM users;
\q
```

---

## ✅ Pronto!

Agora seu sistema está usando um banco de dados real:
- ✅ Dados persistem entre deploys
- ✅ Múltiplos usuários podem usar
- ✅ Orçamentos são salvos permanentemente
- ✅ Configurações da empresa são mantidas

---

## 🔧 Troubleshooting

### Erro: "DATABASE_URL não está configurada"
- ✅ Certifique-se de ter criado o arquivo `.env` na raiz do projeto
- ✅ Verifique se a variável `DATABASE_URL` está presente
- ✅ Não deixe espaços antes ou depois do `=`

### Erro: "Connection refused" ou "Can't reach database server"
- ✅ Verifique se o servidor PostgreSQL está rodando (local)
- ✅ Verifique se a `DATABASE_URL` está correta
- ✅ Certifique-se que copiou a string completa (sem quebras de linha)
- ✅ Para Neon, verifique se o projeto não está pausado

### Erro: "Table doesn't exist"
- ✅ Execute `npm run db:push` para criar as tabelas
- ✅ Verifique se o Prisma Client foi gerado: `npm run db:generate`

### Erro: "Authentication failed"
- ✅ Verifique se a senha na connection string está correta
- ✅ Para Neon, gere uma nova connection string se necessário
- ✅ Para local, verifique a senha do usuário `postgres`

### Erro: "Database does not exist"
- ✅ Certifique-se de ter criado o banco de dados
- ✅ Verifique se o nome do banco na `DATABASE_URL` está correto

### Erro: "Prisma Client not generated"
- ✅ Execute `npm run db:generate`
- ✅ Verifique se todas as dependências foram instaladas: `npm install`

---

## 📚 Recursos

- **Neon Docs:** https://neon.tech/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Vercel Env Vars:** https://vercel.com/docs/concepts/projects/environment-variables
