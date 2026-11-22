// GPU sky: smooth gradient, sun corona and light shafts, stars, Milky Way, aurora, shooting stars and moon halo.
// Drawn on a <canvas> behind the SVG scenery. If WebGL is not available the SVG sky is used instead.
import { useEffect, useRef, type MutableRefObject } from 'react'
import { hex } from './ink'

export interface SkyUniforms {
  top: string
  mid: string
  bottom: string
  glow: string
  night: number
  overcast: number
  drought: number
  sun: { x: number; y: number; low: number } | null
  sunVis: number
  moon: { x: number; y: number } | null
  moonLight: number
  aurora: number
  meteors: number
  starVis: number
  /** 0..1 wind strength: high haze and wisps drift faster */
  wind?: number
  /** 0..1 how much warm sunrise/sunset glow lies along the horizon */
  dusk?: number
  /** 0..1 wispy high cloud on fair days (more in autumn and winter) */
  wisps?: number
}

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uNight, uOvercast, uDrought, uSunVis, uSunLow, uOcc, uMoonLight, uAurora, uMeteors, uStarVis, uWind, uDusk, uWisps;
uniform vec3 uTop, uMid, uBot, uGlow;
uniform vec2 uSun, uMoon;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }

void main(){
  vec2 P = vec2(vUv.x * 1000.0, (1.0 - vUv.y) * 720.0);
  float y = P.y / 720.0;
  vec3 col = y < 0.38 ? mix(uTop, uMid, smoothstep(0.0, 0.38, y)) : mix(uMid, uBot, smoothstep(0.38, 0.62, y));

  // soft high cloud texture when overcast or hazy
  float drift = uTime * (0.003 + uWind * 0.03);
  float haze = fbm(vec2(P.x / 260.0 + drift, P.y / 90.0));
  col = mix(col, col * 0.9 + vec3(0.06), uOvercast * smoothstep(0.35, 0.75, haze) * 0.6);
  col = mix(col, col + vec3(0.05, 0.04, 0.0), uDrought * haze * 0.5);

  // high wispy cirrus, stretched along the wind, lit warm when the sun is low
  if (uWisps > 0.01) {
    float w = fbm(vec2(P.x / 420.0 + drift * 1.6, P.y / 26.0 + sin(P.x / 300.0) * 0.6));
    float streak = smoothstep(0.55, 0.85, w) * smoothstep(0.42, 0.12, y) * smoothstep(0.0, 0.08, y);
    vec3 wc = mix(vec3(1.0), mix(uGlow, vec3(1.0, 0.62, 0.5), 0.4), uSunLow * (1.0 - uNight));
    col = mix(col, wc * (1.0 - uNight * 0.75), streak * uWisps * 0.4);
  }

  // sunrise and sunset: a warm band along the horizon, deepest under the sun
  if (uDusk > 0.01) {
    float band = exp(-pow((y - 0.56) / 0.09, 2.0));
    float side = 0.55 + 0.45 * exp(-abs(P.x - uSun.x) / 360.0);
    col += vec3(1.0, 0.55, 0.32) * band * side * uDusk * 0.22;
    col = mix(col, col * vec3(1.02, 0.94, 1.06), uDusk * smoothstep(0.35, 0.0, y) * 0.5);
  }

  // ---- night: stars, milky way, aurora, meteors
  if (uNight > 0.01) {
    float sv = uNight * uStarVis * smoothstep(0.62, 0.3, y);
    // milky way: a faint dusty band across the sky
    vec2 q = P / 1000.0;
    float band = exp(-pow((q.y * 1.4 - 0.15 - q.x * 0.55) * 4.0, 2.0));
    float dust = fbm(q * 9.0) * fbm(q * 23.0 + 3.0);
    col += vec3(0.55, 0.6, 0.85) * band * dust * 0.32 * sv;
    col -= vec3(0.03) * band * smoothstep(0.45, 0.7, fbm(q * 14.0 + 9.0)) * sv;

    // stars on several grid sizes
    for (int k = 0; k < 3; k++) {
      float cell = k == 0 ? 9.0 : (k == 1 ? 17.0 : 31.0);
      vec2 g = floor(P / cell);
      vec2 f = P - (g + 0.5) * cell;
      float h = hash(g + float(k) * 7.31);
      float thresh = k == 0 ? 0.86 : (k == 1 ? 0.8 : 0.72);
      if (h > thresh) {
        vec2 off = (vec2(hash(g + 1.7), hash(g + 9.2)) - 0.5) * cell * 0.7;
        float d = length(f - off);
        float size = (k == 0 ? 0.5 : (k == 1 ? 0.8 : 1.25)) * (0.6 + h);
        float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
        float s = exp(-d * d / (size * size)) + 0.25 * exp(-d / (size * 2.4)) * float(k == 2);
        vec3 tint = mix(vec3(1.0, 0.86, 0.72), vec3(0.75, 0.85, 1.0), hash(g + 3.3));
        col += tint * s * tw * sv * (k == 2 ? 1.0 : 0.8) * (1.0 + band * 0.6);
        if (k == 2 && h > 0.97) { // bright star with a little cross sparkle
          float cr = exp(-abs(f.x - off.x) * 1.6) * exp(-abs(f.y - off.y) * 0.18) + exp(-abs(f.y - off.y) * 1.6) * exp(-abs(f.x - off.x) * 0.18);
          col += tint * cr * 0.35 * tw * sv;
        }
      }
    }

    // aurora curtains
    if (uAurora > 0.01) {
      float x = P.x / 1000.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float base = 0.36 - fi * 0.045 + 0.05 * sin(x * 4.2 + uTime * 0.05 + fi * 2.0) + 0.06 * (fbm(vec2(x * 3.0 + fi * 5.0, uTime * 0.025)) - 0.5);
        float hgt = base - y;
        if (hgt > -0.01) {
          float rays = 0.35 + 0.65 * pow(fbm(vec2(x * 55.0 + fi * 13.0 + sin(uTime * 0.07 + fi) * 1.5, uTime * 0.06)), 1.6);
          float lower = smoothstep(-0.01, 0.012, hgt);
          float fall = exp(-hgt * (7.0 + fi * 2.0));
          float wave = 0.6 + 0.4 * sin(x * 9.0 - uTime * 0.12 + fi * 1.7);
          vec3 c = mix(vec3(0.25, 1.0, 0.55), vec3(0.15, 0.85, 0.75), fi * 0.4);
          c = mix(c, vec3(0.65, 0.35, 0.95), smoothstep(0.05, 0.22, hgt));
          acc += c * lower * fall * rays * wave * (0.55 - fi * 0.12);
        }
      }
      col += acc * uAurora * uNight * smoothstep(0.62, 0.38, y);
    }

    // shooting stars: a short streak now and then (about one a minute, so each one is a little surprise)
    if (uMeteors > 0.0) {
      float slot = floor(uTime / 9.0);
      float r = hash(vec2(slot, 4.2));
      if (r < 0.16) {
        float t = (uTime - slot * 9.0) / 0.9;
        if (t < 1.0) {
          vec2 a0 = vec2(250.0 + hash(vec2(slot, 1.0)) * 700.0, 40.0 + hash(vec2(slot, 2.0)) * 170.0);
          vec2 dir = normalize(vec2(-1.0, 0.45 + hash(vec2(slot, 3.0)) * 0.3));
          vec2 head = a0 + dir * t * 260.0;
          vec2 rel = P - head;
          float along = dot(rel, -dir);
          float perp = length(rel + dir * along);
          float tail = step(0.0, along) * exp(-along / 70.0);
          float fade = sin(t * 3.14159);
          col += vec3(1.0, 0.97, 0.9) * (exp(-perp * perp / 1.1) * tail + exp(-dot(rel, rel) / 6.0)) * fade * uNight * uMeteors;
        }
      }
    }
  }

  // ---- moon halo
  if (uMoonLight > 0.0) {
    float d = length(P - uMoon);
    col += vec3(0.75, 0.82, 1.0) * (exp(-d / 70.0) * 0.32 + exp(-d / 220.0) * 0.12) * uMoonLight;
  }

  // ---- sun: corona, bloom and light shafts (stronger when a cloud passes in front)
  if (uSunVis > 0.0) {
    vec2 d = P - uSun;
    float r = length(d);
    float ang = atan(d.y, d.x);
    vec3 warm = mix(uGlow, vec3(1.0, 0.6, 0.35), uSunLow * 0.6);
    col += warm * (exp(-r / 190.0) * 0.22 * (1.0 - uOcc * 0.5) + exp(-r / 60.0) * 0.4 + exp(-r / 26.0) * 0.3) * uSunVis;
    float shafts = pow(noise(vec2(ang * 9.0, uTime * 0.07)) * 0.55 + noise(vec2(ang * 31.0, uTime * 0.11 + 3.0)) * 0.45, 2.4);
    float reach = 240.0 + 280.0 * uOcc;
    float beam = shafts * exp(-r / reach) * smoothstep(44.0, 70.0, r);
    col += warm * beam * (0.28 + uOcc * 1.6) * uSunVis * (1.0 - uOvercast * 0.7);
    // when clouds hide the sun, darken the gaps between beams a little for crisp crepuscular rays
    col -= vec3(0.05) * (1.0 - shafts) * uOcc * exp(-r / reach) * smoothstep(44.0, 90.0, r) * uSunVis;
  }

  // gentle dithering so gradients never band
  col += (hash(P + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const rgb = (c: string) => hex(c).map((v) => v / 255) as [number, number, number]

/** Returns false if WebGL could not start (then the SVG sky is used). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export default function SkyShader({
  uniforms,
  occlusion,
  running,
  onFail,
}: {
  uniforms: SkyUniforms
  occlusion: MutableRefObject<number>
  running: boolean
  onFail: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef(uniforms)
  latest.current = uniforms
  const runRef = useRef(running)
  runRef.current = running

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const gl = (cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }) as WebGLRenderingContext | null)
    if (!gl) return onFail()
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    let prog: WebGLProgram
    try {
      prog = gl.createProgram()!
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link')
    } catch (e) {
      console.warn('Sky shader unavailable', e)
      return onFail()
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n: string) => gl.getUniformLocation(prog, n)
    const u = {
      time: U('uTime'), night: U('uNight'), overcast: U('uOvercast'), drought: U('uDrought'), sunVis: U('uSunVis'), sunLow: U('uSunLow'),
      occ: U('uOcc'), moonLight: U('uMoonLight'), aurora: U('uAurora'), meteors: U('uMeteors'), starVis: U('uStarVis'),
      wind: U('uWind'), dusk: U('uDusk'), wisps: U('uWisps'),
      top: U('uTop'), mid: U('uMid'), bot: U('uBot'), glow: U('uGlow'), sun: U('uSun'), moon: U('uMoon'),
    }

    let raf = 0
    let last = 0
    let occ = 0
    const t0 = performance.now()
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.round(cv.clientWidth * dpr)
      const h = Math.round(cv.clientHeight * dpr)
      if (cv.width !== w || cv.height !== h) {
        cv.width = w
        cv.height = h
      }
      gl.viewport(0, 0, cv.width, cv.height)
    }
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (!runRef.current && last) return
      if (now - last < 1000 / 30) return // 30 fps is plenty for a sky
      last = now
      resize()
      const v = latest.current
      occ += (occlusion.current - occ) * 0.08
      gl.uniform1f(u.time, (now - t0) / 1000)
      gl.uniform1f(u.night, v.night)
      gl.uniform1f(u.overcast, v.overcast)
      gl.uniform1f(u.drought, v.drought)
      gl.uniform1f(u.sunVis, v.sun ? v.sunVis : 0)
      gl.uniform1f(u.sunLow, v.sun?.low ?? 0)
      gl.uniform1f(u.occ, occ)
      gl.uniform1f(u.moonLight, v.moon ? v.moonLight : 0)
      gl.uniform1f(u.aurora, v.aurora)
      gl.uniform1f(u.meteors, v.meteors)
      gl.uniform1f(u.starVis, v.starVis)
      gl.uniform1f(u.wind, v.wind ?? 0.15)
      gl.uniform1f(u.dusk, v.dusk ?? 0)
      gl.uniform1f(u.wisps, v.wisps ?? 0)
      gl.uniform3fv(u.top, rgb(v.top))
      gl.uniform3fv(u.mid, rgb(v.mid))
      gl.uniform3fv(u.bot, rgb(v.bottom))
      gl.uniform3fv(u.glow, rgb(v.glow))
      gl.uniform2f(u.sun, v.sun?.x ?? -999, v.sun?.y ?? -999)
      gl.uniform2f(u.moon, v.moon?.x ?? -999, v.moon?.y ?? -999)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(draw)
    const lost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      onFail()
    }
    cv.addEventListener('webglcontextlost', lost)
    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('webglcontextlost', lost)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvas} className="gs-skycanvas" aria-hidden />
}
