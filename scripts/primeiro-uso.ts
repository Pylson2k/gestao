/**
 * Um comando só: aplica o schema no Postgres e cria o usuário inicial (gustavo).
 * Uso: npm run db:primeiro-uso
 *
 * Você só precisa ter .env com DATABASE_URL válida (copie de .env.example e preencha).
 */

import 'dotenv/config'
import { execSync, type ExecSyncOptions } from 'node:child_process'

function run(cmd: string) {
  const opts: ExecSyncOptions = { stdio: 'inherit', env: process.env }
  if (process.platform === 'win32') {
    opts.shell = 'cmd.exe'
  }
  execSync(cmd, opts)
}

function main() {
  const url = process.env.DATABASE_URL?.trim()

  console.log('\n========== Configuração do banco (primeiro uso) ==========\n')

  if (!url) {
    console.log('Falta DATABASE_URL.\n')
    console.log('O que fazer (uma vez):')
    console.log('  1) Copie o arquivo .env.example para .env (na raiz deste projeto).')
    console.log('  2) Abra .env e cole a connection string do Neon (ou do seu PostgreSQL).')
    console.log('  3) Rode de novo: npm run db:primeiro-uso\n')
    process.exit(1)
  }

  if (url.includes('usuario:senha@') || url.includes('USUARIO:SENHA')) {
    console.log('DATABASE_URL ainda está com texto de exemplo (usuario:senha).')
    console.log('Substitua pelo usuário e senha reais que o painel do banco mostrar.\n')
    process.exit(1)
  }

  console.log('Passo 1/2: criar/atualizar tabelas (prisma db push)...\n')
  try {
    run('npx prisma db push')
  } catch {
    console.log('\nSe deu erro de autenticação (P1000): usuário ou senha na URL estão errados.')
    console.log('Copie de novo a string do Neon: Connection details → URI.\n')
    process.exit(1)
  }

  console.log('\nPasso 2/2: usuário inicial gustavo / senha gustavo123 (db:setup)...\n')
  try {
    run('npm run db:setup')
  } catch {
    console.log('\nO schema já foi aplicado; ajuste o erro acima ou rode: npm run db:setup\n')
    process.exit(1)
  }

  console.log('\n========== Pronto ==========')
  console.log('Inicie o app com: npm run dev')
  console.log('Login: gustavo  |  Senha: gustavo123 (troque depois no perfil)\n')
}

main()
