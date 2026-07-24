import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createSessionToken,
  verifySessionToken,
  timingSafeStringEqual,
  generateTemporaryPassword,
} from '../lib/session'
import { isSafeImageUrl } from '../lib/safe-url'

describe('session tokens', () => {
  it('creates and verifies a valid token', () => {
    const token = createSessionToken({ mustChangePassword: false })
    const session = verifySessionToken(token)
    assert.ok(session)
    assert.equal(session!.mustChangePassword, false)
    assert.equal(session!.sub, '1')
  })

  it('rejects tampered tokens', () => {
    const token = createSessionToken({ mustChangePassword: true })
    const [body] = token.split('.')
    assert.equal(verifySessionToken(`${body}.invalidsig`), null)
    assert.equal(verifySessionToken(''), null)
    assert.equal(verifySessionToken(null), null)
  })

  it('preserves mustChangePassword flag', () => {
    const token = createSessionToken({ mustChangePassword: true })
    assert.equal(verifySessionToken(token)?.mustChangePassword, true)
  })
})

describe('timingSafeStringEqual', () => {
  it('compares equal and unequal secrets', () => {
    assert.equal(timingSafeStringEqual('abc', 'abc'), true)
    assert.equal(timingSafeStringEqual('abc', 'abd'), false)
    assert.equal(timingSafeStringEqual('abc', 'ab'), false)
  })
})

describe('generateTemporaryPassword', () => {
  it('returns requested length', () => {
    assert.equal(generateTemporaryPassword(16).length, 16)
  })
})

describe('isSafeImageUrl', () => {
  it('accepts http(s) and safe data images', () => {
    assert.equal(isSafeImageUrl('https://example.com/logo.png'), true)
    assert.equal(isSafeImageUrl('http://example.com/logo.png'), true)
    assert.equal(
      isSafeImageUrl('data:image/png;base64,iVBORw0KGgo='),
      true
    )
  })

  it('rejects dangerous schemes and svg data', () => {
    assert.equal(isSafeImageUrl('javascript:alert(1)'), false)
    assert.equal(isSafeImageUrl('data:text/html;base64,abc'), false)
    assert.equal(isSafeImageUrl('data:image/svg+xml;base64,abc'), false)
    assert.equal(isSafeImageUrl(''), false)
  })
})
