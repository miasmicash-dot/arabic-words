// Web Push reminders. iOS requires the app to be installed to the Home Screen (iOS 16.4+),
// and Notification.requestPermission() must be called from a user gesture (e.g. a button tap).

const WORKER_URL = ((import.meta.env.VITE_WORKER_URL as string | undefined) ?? '').replace(/\/$/, '')
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

function urlBase64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function post(path: string, body: unknown, method = 'POST'): Promise<void> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Reminder server error (${res.status})`)
}

/** True on iOS Safari (any iOS browser) when the app is NOT running as an installed Home-Screen app. */
export function isIosNotInstalled(): boolean {
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return !standalone
}

/** Whether this browser can do push at all (false on iOS until installed to Home Screen). */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Ask permission, subscribe, and register with the reminder server. Call from a tap handler. */
export async function enableReminders(time: string, timezone: string): Promise<void> {
  if (!WORKER_URL || !VAPID_PUBLIC_KEY) throw new Error('Reminders are not configured (missing VITE_WORKER_URL / VITE_VAPID_PUBLIC_KEY).')
  if (!pushSupported()) throw new Error('Notifications are not supported here. On iPhone, add the app to your Home Screen first.')

  const permission = await Notification.requestPermission() // must stay first await for iOS user-gesture rule
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  await post('/subscribe', { subscription: subscription.toJSON(), time, timezone })
}

/** Tell the server how many cards are due so the notification can say "N words ready". Safe to call when disabled. */
export async function updateDueCount(n: number): Promise<void> {
  if (!WORKER_URL || !pushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await post('/due', { endpoint: subscription.endpoint, dueCount: n })
  } catch {
    // best-effort; a failed count update must never break the app
  }
}

export async function disableReminders(): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  if (WORKER_URL) {
    try {
      await post('/subscribe', { endpoint }, 'DELETE')
    } catch {
      // server will drop it on the next 404/410 anyway
    }
  }
}
