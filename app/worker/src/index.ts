import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push'

export interface Env {
  SUBS: KVNamespace
  ALLOWED_ORIGIN: string // e.g. https://arabic-words.pages.dev (or * while testing)
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string // mailto:you@example.com
}

interface StoredSub {
  subscription: PushSubscription
  time: string // "HH:MM" local to timezone
  timezone: string // IANA, e.g. "Europe/London"
  dueCount: number | null
  lastSent: string | null // local date "YYYY-MM-DD" in `timezone`
}

const PREFIX = 'sub:'

async function keyFor(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return PREFIX + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function cors(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGIN === '*' || origin === env.ALLOWED_ORIGIN ? (env.ALLOWED_ORIGIN === '*' ? '*' : origin) : env.ALLOWED_ORIGIN
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(env: Env, req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(env, req) } })
}

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function localParts(now: Date, timezone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

function isPushSubscription(s: any): s is PushSubscription {
  return (
    s &&
    typeof s.endpoint === 'string' &&
    s.endpoint.startsWith('https://') &&
    typeof s.keys?.p256dh === 'string' &&
    typeof s.keys?.auth === 'string'
  )
}

async function handleFetch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) })

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(env, req, { error: 'invalid json' }, 400)
  }

  if (url.pathname === '/subscribe' && req.method === 'POST') {
    const { subscription, time, timezone } = body ?? {}
    if (!isPushSubscription(subscription)) return json(env, req, { error: 'bad subscription' }, 400)
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return json(env, req, { error: 'bad time' }, 400)
    if (!validTimezone(timezone)) return json(env, req, { error: 'bad timezone' }, 400)
    const key = await keyFor(subscription.endpoint)
    const prev = await env.SUBS.get<StoredSub>(key, 'json')
    const rec: StoredSub = {
      subscription: { endpoint: subscription.endpoint, expirationTime: null, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
      time,
      timezone,
      dueCount: prev?.dueCount ?? null,
      lastSent: prev?.lastSent ?? null,
    }
    await env.SUBS.put(key, JSON.stringify(rec))
    return json(env, req, { ok: true })
  }

  if (url.pathname === '/due' && req.method === 'POST') {
    const { endpoint, dueCount } = body ?? {}
    if (typeof endpoint !== 'string' || !Number.isFinite(dueCount) || dueCount < 0) return json(env, req, { error: 'bad request' }, 400)
    const key = await keyFor(endpoint)
    const rec = await env.SUBS.get<StoredSub>(key, 'json')
    if (!rec) return json(env, req, { error: 'not subscribed' }, 404)
    rec.dueCount = Math.floor(dueCount)
    await env.SUBS.put(key, JSON.stringify(rec))
    return json(env, req, { ok: true })
  }

  if (url.pathname === '/subscribe' && req.method === 'DELETE') {
    const { endpoint } = body ?? {}
    if (typeof endpoint !== 'string') return json(env, req, { error: 'bad request' }, 400)
    await env.SUBS.delete(await keyFor(endpoint))
    return json(env, req, { ok: true })
  }

  return json(env, req, { error: 'not found' }, 404)
}

function messageFor(rec: StoredSub): string {
  const n = rec.dueCount
  if (n === null) return 'Your Arabic words are ready to review'
  if (n <= 0) return 'Time for your daily Arabic practice'
  return `${n} word${n === 1 ? '' : 's'} ready to review`
}

export async function sendDueReminders(env: Env, now = new Date()): Promise<{ sent: number; removed: number }> {
  let sent = 0
  let removed = 0
  let cursor: string | undefined
  do {
    const page = await env.SUBS.list({ prefix: PREFIX, cursor })
    for (const { name } of page.keys) {
      const rec = await env.SUBS.get<StoredSub>(name, 'json')
      if (!rec) continue
      const { date, hour } = localParts(now, rec.timezone)
      if (hour !== Number(rec.time.slice(0, 2)) || rec.lastSent === date) continue

      const payload = await buildPushPayload(
        { data: JSON.stringify({ title: 'Arabic Words', body: messageFor(rec) }), options: { ttl: 6 * 3600, urgency: 'normal' } },
        rec.subscription,
        { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
      )
      let status = 0
      try {
        status = (await fetch(rec.subscription.endpoint, payload)).status
      } catch {
        continue // network blip: try again next hour (same local hour won't match, so skipped today)
      }
      if (status === 404 || status === 410) {
        await env.SUBS.delete(name)
        removed++
      } else if (status >= 200 && status < 300) {
        rec.lastSent = date
        rec.dueCount = null // stale after sending; the app refreshes it when opened
        await env.SUBS.put(name, JSON.stringify(rec))
        sent++
      } else {
        console.warn(`push to ${name} failed: ${status}`)
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return { sent, removed }
}

export default {
  fetch: handleFetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sendDueReminders(env))
  },
} satisfies ExportedHandler<Env>
