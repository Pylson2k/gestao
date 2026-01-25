/**
 * Script para criar usuários iniciais via SQL direto
 */

import 'dotenv/config'
import { Client } from 'pg'
import { hash } from 'bcryptjs'

async function createUsers() {
  console.log('👥 Criando usuários iniciais...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ Erro: DATABASE_URL não está configurada!')
    process.exit(1)
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco de dados!\n')

    // Hash das senhas
    const hashedPassword1 = await hash('gustavo123', 10)
    const hashedPassword2 = await hash('giovanni123', 10)

    // Criar usuário gustavo
    const user1Result = await client.query(`
      INSERT INTO users (id, username, name, email, password, "mustChangePassword", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE
      SET password = $4, "mustChangePassword" = $5, "updatedAt" = NOW()
      RETURNING id, username, name, email;
    `, ['gustavo', 'Gustavo', 'gustavo@servipro.com', hashedPassword1, true])

    console.log('✅ Usuário criado/atualizado:')
    console.log(`   - ${user1Result.rows[0].username} (${user1Result.rows[0].name})`)
    console.log(`     Email: ${user1Result.rows[0].email}`)

    // Criar usuário giovanni
    const user2Result = await client.query(`
      INSERT INTO users (id, username, name, email, password, "mustChangePassword", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE
      SET password = $4, "mustChangePassword" = $5, "updatedAt" = NOW()
      RETURNING id, username, name, email;
    `, ['giovanni', 'Giovanni', 'giovanni@servipro.com', hashedPassword2, true])

    console.log(`   - ${user2Result.rows[0].username} (${user2Result.rows[0].name})`)
    console.log(`     Email: ${user2Result.rows[0].email}`)

    console.log('\n' + '═'.repeat(50))
    console.log('📋 CREDENCIAIS:')
    console.log('═'.repeat(50))
    console.log('   Usuário: gustavo | Senha: gustavo123')
    console.log('   Usuário: giovanni | Senha: giovanni123')
    console.log('═'.repeat(50))
    console.log('\n✅ Usuários criados com sucesso!')
  } catch (error: any) {
    console.error('\n❌ Erro ao criar usuários:')
    console.error(`   ${error.message}\n`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

createUsers()
