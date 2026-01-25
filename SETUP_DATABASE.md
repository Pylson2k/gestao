# 🗄️ Guia Completo: Configurar Banco de Dados PostgreSQL

## Passo 1: Criar Banco de Dados Gratuito no Neon

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

## Passo 2: Configurar no Vercel

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

## Passo 3: Criar as Tabelas no Banco

### 3.1. Opção A: Via Vercel (Recomendado)

Após adicionar a variável `DATABASE_URL` no Vercel:

1. Vá em **"Deployments"**
2. Clique nos **3 pontinhos** do último deploy
3. Clique em **"Redeploy"**
4. Aguarde o deploy terminar

O sistema vai criar as tabelas automaticamente na primeira execução!

### 3.2. Opção B: Via Terminal Local (Alternativa)

Se você tem o banco configurado localmente:

```bash
# Gerar Prisma Client
npm run db:generate

# Criar as tabelas no banco
npm run db:push

# (Opcional) Popular com usuários iniciais
npm run db:seed
```

---

## Passo 4: Verificar se Funcionou

### 4.1. Testar Reset de Senhas
1. Acesse: `https://SEU-DOMINIO.vercel.app/reset`
2. Clique em **"Resetar Senhas"**
3. Deve aparecer: **"Senhas resetadas com sucesso!"**

### 4.2. Fazer Login
1. Acesse: `https://SEU-DOMINIO.vercel.app/login`
2. Use:
   - **Usuário:** `gustavo`
   - **Senha:** `gustavo123`

### 4.3. Verificar no Neon
1. Volte no **Neon Dashboard**
2. Clique em **"SQL Editor"**
3. Execute:
   ```sql
   SELECT * FROM users;
   ```
4. Deve aparecer os usuários criados!

---

## ✅ Pronto!

Agora seu sistema está usando um banco de dados real:
- ✅ Dados persistem entre deploys
- ✅ Múltiplos usuários podem usar
- ✅ Orçamentos são salvos permanentemente
- ✅ Configurações da empresa são mantidas

---

## 🔧 Troubleshooting

### Erro: "Connection refused"
- Verifique se a `DATABASE_URL` está correta no Vercel
- Certifique-se que copiou a string completa

### Erro: "Table doesn't exist"
- Faça um redeploy no Vercel
- Ou execute `npm run db:push` localmente

### Erro: "Authentication failed"
- Verifique se a senha na connection string está correta
- Gere uma nova connection string no Neon se necessário

---

## 📚 Recursos

- **Neon Docs:** https://neon.tech/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Vercel Env Vars:** https://vercel.com/docs/concepts/projects/environment-variables
