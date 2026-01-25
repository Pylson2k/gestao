/**
 * Script para testar a criação de um orçamento
 */

import 'dotenv/config'
import { Client } from 'pg'

async function testCreateQuote() {
  console.log('🧪 Testando criação de orçamento...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!')
    process.exit(1)
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco de dados!\n')

    // Buscar usuário gustavo
    const userResult = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      ['gustavo']
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Usuário gustavo não encontrado!')
      process.exit(1)
    }

    const userId = userResult.rows[0].id
    console.log(`✅ Usuário encontrado: ${userResult.rows[0].username} (ID: ${userId})\n`)

    // Verificar se pode criar cliente
    console.log('📝 Testando criação de cliente...')
    const clientResult = await client.query(`
      INSERT INTO clients (id, name, phone, address, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
      RETURNING id, name;
    `, ['Cliente Teste', '11999999999', 'Rua Teste, 123'])

    const clientId = clientResult.rows[0].id
    console.log(`✅ Cliente criado: ${clientResult.rows[0].name} (ID: ${clientId})\n`)

    // Verificar se pode criar orçamento
    console.log('📄 Testando criação de orçamento...')
    const year = new Date().getFullYear()
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM quotes WHERE number LIKE $1
    `, [`ORC-${year}-%`])
    
    const count = parseInt(countResult.rows[0].count)
    const number = `ORC-${year}-${String(count + 1).padStart(3, '0')}`
    
    console.log(`   Número do orçamento: ${number}`)

    // Criar orçamento
    const quoteResult = await client.query(`
      INSERT INTO quotes (id, number, "userId", "clientId", subtotal, discount, total, status, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, number, subtotal, total;
    `, [number, userId, clientId, 1000, 0, 1000, 'draft'])

    const quoteId = quoteResult.rows[0].id
    console.log(`✅ Orçamento criado: ${quoteResult.rows[0].number} (ID: ${quoteId})\n`)

    // Criar item de serviço
    console.log('🔧 Testando criação de item de serviço...')
    const serviceResult = await client.query(`
      INSERT INTO service_items (id, "quoteId", name, quantity, "unitPrice")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
      RETURNING id, name;
    `, [quoteId, 'Serviço Teste', 1, 500])

    console.log(`✅ Item de serviço criado: ${serviceResult.rows[0].name}\n`)

    // Criar item de material
    console.log('📦 Testando criação de item de material...')
    const materialResult = await client.query(`
      INSERT INTO material_items (id, "quoteId", name, quantity, "unitPrice")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
      RETURNING id, name;
    `, [quoteId, 'Material Teste', 2, 250])

    console.log(`✅ Item de material criado: ${materialResult.rows[0].name}\n`)

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...')
    await client.query('DELETE FROM material_items WHERE "quoteId" = $1', [quoteId])
    await client.query('DELETE FROM service_items WHERE "quoteId" = $1', [quoteId])
    await client.query('DELETE FROM quotes WHERE id = $1', [quoteId])
    await client.query('DELETE FROM clients WHERE id = $1', [clientId])
    console.log('✅ Dados de teste removidos\n')

    console.log('🎉 Todos os testes passaram! A criação de orçamentos está funcionando!')
  } catch (error: any) {
    console.error('\n❌ Erro no teste:')
    console.error(`   ${error.message}\n`)
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('💡 Dica: Execute npm run db:push para criar as tabelas\n')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

testCreateQuote()
