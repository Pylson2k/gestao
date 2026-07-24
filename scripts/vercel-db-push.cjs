/**
 * Sincroniza o schema no Postgres durante o deploy da Vercel.
 * Não derruba o build se a conexão falhar (timeout Neon / URL pooled, etc.) —
 * o next build ainda sobe; rode `npm run db:push` localmente apontando ao Neon se precisar.
 */
const { execSync } = require('child_process')

const url = process.env.DATABASE_URL
if (!url || !String(url).trim()) {
  console.warn('[vercel-db] DATABASE_URL ausente — pulando prisma db push')
  process.exit(0)
}

console.log('[vercel-db] Sincronizando schema (prisma db push)...')
try {
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: process.env,
    timeout: 90_000,
  })
  console.log('[vercel-db] Schema OK')
  process.exit(0)
} catch (err) {
  const msg = err && err.message ? err.message : String(err)
  console.error('[vercel-db] prisma db push falhou:', msg)
  console.error(
    '[vercel-db] Continuando o build. Se o app falhar no banco, confira DATABASE_URL no Vercel (URI Neon com sslmode=require) e rode npm run db:push localmente.'
  )
  process.exit(0)
}
