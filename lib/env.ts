const REQUIRED_ENV_VARS = ['DATABASE_URL'] as const

export function getEnvHealth() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  return {
    ok: missing.length === 0,
    missing,
  }
}

