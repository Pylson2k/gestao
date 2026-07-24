/**
 * Sincroniza o schema no Postgres durante o deploy da Vercel.
 * - Corrige aspas acidentais na DATABASE_URL
 * - Não derruba o build se a URL for inválida ou o push falhar
 */
const { execSync } = require('child_process')

function sanitizeDatabaseUrl(raw) {
  if (raw == null) return ''
  let url = String(raw).trim()
  // Aspas coladas no painel da Vercel quebram o scheme (P1013)
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim()
  }
  // Colaram "DATABASE_URL=postgresql://..." por engano
  if (/^DATABASE_URL\s*=\s*/i.test(url)) {
    url = url.replace(/^DATABASE_URL\s*=\s*/i, '').trim()
    if (
      (url.startsWith('"') && url.endsWith('"')) ||
      (url.startsWith("'") && url.endsWith("'"))
    ) {
      url = url.slice(1, -1).trim()
    }
  }
  return url
}

function describeUrl(url) {
  try {
    const u = new URL(url)
    return `${u.protocol}//***@${u.host}${u.pathname}`
  } catch {
    const head = url.slice(0, 24)
    return `formato invalido (inicia com: ${JSON.stringify(head)})`
  }
}

const url = sanitizeDatabaseUrl(process.env.DATABASE_URL)
if (!url) {
  console.warn('[vercel-db] DATABASE_URL ausente — pulando prisma db push')
  process.exit(0)
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.error('[vercel-db] DATABASE_URL invalida (scheme nao reconhecido).')
  console.error('[vercel-db] Deve comecar com postgresql:// ou postgres://')
  console.error('[vercel-db] Valor visto:', describeUrl(url))
  console.error(
    '[vercel-db] No Vercel: edite DATABASE_URL, cole a URI do Neon SEM aspas, salve e redeploy.'
  )
  console.error('[vercel-db] Continuando o build sem db push.')
  process.exit(0)
}

process.env.DATABASE_URL = url
console.log('[vercel-db] Sincronizando schema em', describeUrl(url))

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
    '[vercel-db] Continuando o build. Corrija DATABASE_URL no Vercel e/ou rode npm run db:push localmente.'
  )
  process.exit(0)
}
