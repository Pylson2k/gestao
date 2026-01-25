# 🚀 Guia Rápido: Configurar Banco de Dados

## ⚡ Início Rápido (5 minutos)

### 1. Escolha uma opção:

**Opção A: Neon (Nuvem - Gratuito)**
- Acesse: https://neon.tech
- Crie uma conta gratuita
- Crie um novo projeto
- Copie a connection string

**Opção B: PostgreSQL Local**
- Instale PostgreSQL no seu computador
- Crie um banco chamado `servipro`
- Use: `postgresql://postgres:senha@localhost:5432/servipro`

### 2. Configure o arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="sua_connection_string_aqui"
```

### 3. Execute os comandos:

```bash
# Instalar dependências (se ainda não fez)
npm install

# Gerar Prisma Client
npm run db:generate

# Criar tabelas no banco
npm run db:push

# Criar usuários iniciais
npm run db:seed

# Testar conexão
npm run db:test
```

### 4. Pronto! 🎉

Agora você pode:
- Fazer login com: `gustavo` / `gustavo123`
- Ou: `giovanni` / `giovanni123`
- Iniciar o servidor: `npm run dev`

---

## 📚 Documentação Completa

Para instruções detalhadas, consulte: [SETUP_DATABASE.md](./SETUP_DATABASE.md)

---

## 🔍 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:push` | Cria/atualiza tabelas no banco |
| `npm run db:seed` | Cria usuários iniciais |
| `npm run db:test` | Testa a conexão com o banco |
| `npm run db:setup` | Setup completo do banco |

---

## ❓ Problemas?

Execute `npm run db:test` para diagnosticar problemas de conexão.

Veja a seção de Troubleshooting em [SETUP_DATABASE.md](./SETUP_DATABASE.md)
