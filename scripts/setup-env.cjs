/* Cria .env a partir de .env.example se .env ainda não existir (não sobrescreve). */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

if (fs.existsSync(envPath)) {
  process.exit(0)
}

if (!fs.existsSync(examplePath)) {
  console.warn('setup-env: .env.example não encontrado, ignorando.')
  process.exit(0)
}

fs.copyFileSync(examplePath, envPath)
console.log('Arquivo .env criado a partir de .env.example.')
console.log('Edite .env e coloque sua DATABASE_URL do Neon (ou Postgres). Depois: npm run db:sync')
