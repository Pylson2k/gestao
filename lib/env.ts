const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const

/** Em produção, SESSION_SECRET (ou ADMIN_OPERATIONS_SECRET) deve existir — validado em runtime no login. */
export function getEnvHealth() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  return {
    ok: missing.length === 0,
    missing,
  }
}

