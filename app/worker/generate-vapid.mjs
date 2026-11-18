// Generates a VAPID key pair for Web Push. Run: node generate-vapid.mjs
import { generateKeyPairSync } from 'node:crypto'

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const jwk = privateKey.export({ format: 'jwk' })
const b64url = (b) => Buffer.from(b).toString('base64url')
const pub = Buffer.concat([Buffer.from([0x04]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])

console.log('\nPublic key  (safe to share; goes in the app .env as VITE_VAPID_PUBLIC_KEY and in the worker as VAPID_PUBLIC_KEY):')
console.log(b64url(pub))
console.log('\nPrivate key (SECRET; only goes in the worker as VAPID_PRIVATE_KEY, never in the app):')
console.log(jwk.d)
console.log('')
