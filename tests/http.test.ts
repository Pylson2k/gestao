import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from '@/components/ui/button'
import { readApiError } from '@/modules/core/http'

test('Button não envia formulários acidentalmente', () => {
  const markup = renderToStaticMarkup(createElement(Button, null, 'Ação'))
  assert.match(markup, /<button[^>]*type="button"/)
})

test('Button preserva submit quando solicitado explicitamente', () => {
  const markup = renderToStaticMarkup(createElement(Button, { type: 'submit' }, 'Salvar'))
  assert.match(markup, /<button[^>]*type="submit"/)
})

test('readApiError prioritizes structured error payload', async () => {
  const response = new Response(JSON.stringify({ error: 'Falha validada' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
  const message = await readApiError(response)
  assert.equal(message, 'Falha validada')
})

test('readApiError falls back to status text', async () => {
  const response = new Response('not-json', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  })
  const message = await readApiError(response)
  assert.equal(message, 'Service Unavailable')
})

