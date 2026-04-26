type LogLevel = 'info' | 'warn' | 'error'

type LogPayload = Record<string, unknown> & {
  message: string
  scope?: string
}

function emit(level: LogLevel, payload: LogPayload) {
  const line = {
    ts: new Date().toISOString(),
    level,
    scope: payload.scope ?? 'app',
    ...payload,
  }
  if (level === 'error') {
    console.error(JSON.stringify(line))
    return
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(line))
    return
  }
  console.log(JSON.stringify(line))
}

export const logger = {
  info(payload: LogPayload) {
    emit('info', payload)
  },
  warn(payload: LogPayload) {
    emit('warn', payload)
  },
  error(payload: LogPayload) {
    emit('error', payload)
  },
}

