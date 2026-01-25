/**
 * Script para inspecionar o banco usando SQL direto
 * Execute: npx tsx scripts/inspect-database-sql.ts
 */

import 'dotenv/config'
import { Client } from 'pg'

async function inspectDatabase() {
  console.log('🔍 Inspecionando banco de dados...\n')

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

    // Listar todas as tabelas
    console.log('📊 TABELAS NO BANCO:\n')
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `)

    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  Nenhuma tabela encontrada\n')
    } else {
      tablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.tablename}`)
      })
      console.log('')
    }

    // Para cada tabela, mostrar estrutura e dados
    for (const row of tablesResult.rows) {
      const tableName = row.tablename
      console.log(`\n📋 TABELA: ${tableName}`)
      console.log('─'.repeat(50))

      // Contar registros
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      const count = parseInt(countResult.rows[0].count)
      console.log(`   Registros: ${count}`)

      // Mostrar estrutura da tabela
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName])

      if (columnsResult.rows.length > 0) {
        console.log(`\n   Colunas (${columnsResult.rows.length}):`)
        columnsResult.rows.forEach((col: any) => {
          console.log(`      - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[nullable]' : '[required]'}`)
        })
      }

      // Mostrar dados se houver (limitado a 5 registros)
      if (count > 0) {
        console.log(`\n   Dados (mostrando até 5 registros):`)
        try {
          const dataResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 5`)
          dataResult.rows.forEach((record: any, idx: number) => {
            console.log(`\n   Registro ${idx + 1}:`)
            Object.keys(record).forEach(key => {
              const value = record[key]
              // Não mostrar senhas completas
              if (key === 'password' && value) {
                console.log(`      ${key}: ${'*'.repeat(10)} (hash)`)
              } else {
                console.log(`      ${key}: ${value !== null ? value : 'NULL'}`)
              }
            })
          })
          if (count > 5) {
            console.log(`\n   ... e mais ${count - 5} registro(s)`)
          }
        } catch (e: any) {
          console.log(`   ⚠️  Erro ao ler dados: ${e.message}`)
        }
      }
    }

    // Resumo final
    console.log('\n' + '═'.repeat(50))
    console.log('📊 RESUMO GERAL:')
    console.log('═'.repeat(50))
    
    for (const row of tablesResult.rows) {
      const tableName = row.tablename
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      const count = parseInt(countResult.rows[0].count)
      console.log(`   ${tableName}: ${count} registro(s)`)
    }

    console.log('\n✅ Inspeção concluída!')
  } catch (error: any) {
    console.error('\n❌ Erro ao inspecionar banco de dados:')
    console.error(`   ${error.message}\n`)
    if (error.message.includes('does not exist')) {
      console.log('💡 Dica: O banco pode estar vazio ou as tabelas ainda não foram criadas.')
      console.log('   Execute: npm run db:push para criar as tabelas\n')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

inspectDatabase()
