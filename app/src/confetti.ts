// A little celebration: petals, leaves and sparkles in the garden's colours burst out and drift down.
// `size` scales the burst: 'small' for a new word, 'big' for a finished session, a new stage or a new pack.
// One shared full-screen canvas, removed when the last piece has fallen. Respects reduced motion.

type Kind = 'petal' | 'leaf' | 'spark' | 'ribbon'
interface Bit { x: number; y: number; vx: number; vy: number; r: number; spin: number; a: number; s: number; k: Kind; c: string; life: number; wob: number }

let canvas: HTMLCanvasElement | null = null
let bits: Bit[] = []
let raf = 0

function colours(): string[] {
  const css = getComputedStyle(document.documentElement)
  const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d
  return [v('--accent', '#23935a'), v('--glow', '#cfeeb9'), '#ffd166', '#ff8fab', '#ffb4a2', '#9be27a', '#ffffff', '#f6bd60']
}

function shape(ctx: CanvasRenderingContext2D, b: Bit) {
  ctx.fillStyle = b.c
  ctx.beginPath()
  if (b.k === 'petal') {
    ctx.ellipse(0, 0, b.s, b.s * 0.55, 0, 0, Math.PI * 2)
  } else if (b.k === 'leaf') {
    ctx.moveTo(-b.s, 0)
    ctx.quadraticCurveTo(0, -b.s * 0.7, b.s, 0)
    ctx.quadraticCurveTo(0, b.s * 0.7, -b.s, 0)
  } else if (b.k === 'ribbon') {
    ctx.rect(-b.s * 0.9, -b.s * 0.22, b.s * 1.8, b.s * 0.44)
  } else {
    // four-point sparkle
    const s = b.s
    ctx.moveTo(0, -s)
    ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s, 0)
    ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s)
    ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s, 0)
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s)
  }
  ctx.fill()
}

function frame() {
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const dpr = canvas.width / innerWidth
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  bits = bits.filter((b) => b.life > 0 && b.y < innerHeight + 40)
  for (const b of bits) {
    b.vy += 0.16
    b.vx *= 0.985
    b.vy *= 0.985
    b.wob += 0.08
    b.x += b.vx + Math.sin(b.wob) * (b.k === 'spark' ? 0 : 0.7)
    b.y += Math.min(b.vy, b.k === 'spark' ? 6 : 2.6)
    b.r += b.spin
    b.life -= b.k === 'spark' ? 0.022 : 0.006
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2)) * b.a
    ctx.translate(b.x, b.y)
    ctx.rotate(b.r)
    ctx.scale(1, b.k === 'ribbon' || b.k === 'petal' ? Math.abs(Math.cos(b.wob * 1.7)) * 0.8 + 0.2 : 1)
    shape(ctx, b)
    ctx.restore()
  }
  if (bits.length) raf = requestAnimationFrame(frame)
  else {
    canvas.remove()
    canvas = null
  }
}

export function celebrate(size: 'small' | 'big' = 'small', from?: { x: number; y: number }) {
  if (typeof window === 'undefined') return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.className = 'confetti-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    const dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = innerWidth * dpr
    canvas.height = innerHeight * dpr
    document.body.appendChild(canvas)
  }
  const cs = colours()
  const big = size === 'big'
  const n = big ? 150 : 34
  const kinds: Kind[] = ['petal', 'petal', 'leaf', 'spark', 'ribbon']
  const bursts = big ? [{ x: innerWidth * 0.2, y: innerHeight * 0.45 }, { x: innerWidth * 0.8, y: innerHeight * 0.45 }, { x: innerWidth / 2, y: innerHeight * 0.3 }] : [from ?? { x: innerWidth / 2, y: innerHeight * 0.55 }]
  for (let i = 0; i < n; i++) {
    const o = bursts[i % bursts.length]
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * (big ? 2.2 : 1.8)
    const sp = (big ? 9 : 6.5) * (0.45 + Math.random() * 0.75)
    const k = kinds[(Math.random() * kinds.length) | 0]
    bits.push({ x: o.x, y: o.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 6, spin: (Math.random() - 0.5) * 0.25, a: 0.95, s: (k === 'spark' ? 5 : 6) + Math.random() * (big ? 6 : 4), k, c: k === 'leaf' ? cs[(Math.random() < 0.5 ? 0 : 5)] : cs[(Math.random() * cs.length) | 0], life: 1, wob: Math.random() * 6 })
  }
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(frame)
}
