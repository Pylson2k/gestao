/**
 * Script para testar o login diretamente
 */

import 'dotenv/config'
import { Client } from 'pg'
import { compare } from 'bcryptjs'

async function testLogin() {
  console.log('🔍 Testando login...\n')

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

    // Buscar usuário gustavo
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['gustavo']
    )

    if (result.rows.length === 0) {
      console.log('❌ Usuário "gustavo" não encontrado!')
      process.exit(1)
    }

    const user = result.rows[0]
    console.log('✅ Usuário encontrado:')
    console.log(`   Username: ${user.username}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`)
    console.log('')

    // Testar senha
    const testPassword = 'gustavo123'
    console.log(`🔐 Testando senha: "${testPassword}"`)
    
    const passwordMatch = await compare(testPassword, user.password)
    
    if (passwordMatch) {
      console.log('✅ Senha está CORRETA!')
    } else {
      console.log('❌ Senha está INCORRETA!')
      console.log('\n💡 Possíveis problemas:')
      console.log('   - A senha no banco pode não ter sido hasheada corretamente')
      console.log('   - O hash pode estar incorreto')
    }

  } catch (error: any) {
    console.error('\n❌ Erro:')
    console.error(`   ${error.message}\n`)
    process.exit(1)
  } finally {
    await client.end()
  }
}

testLogin()
