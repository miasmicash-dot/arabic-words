// Weather in front of the garden, drawn on the GPU: slanting rain in three depths, drifting snow, and wind gusts
// (soft streaks of air). Purely for looks; it follows the real local weather.
import { useEffect, useRef } from 'react'

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uRain, uSnow, uWind, uNight;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float rain(vec2 uv, float cols, float spd, float len, float thin, float t){
  uv.x += uv.y * (0.12 + uWind * 0.25);
  float cx = floor(uv.x * cols);
  float r = h(vec2(cx, cols));
  float fx = fract(uv.x * cols) - 0.5 - (r - 0.5) * 0.6;
  float yy = uv.y * 0.7 + t * spd * (0.8 + 0.4 * r) + r * 7.0;
  float y = fract(yy);
  float on = step(0.45, h(vec2(cx, floor(yy))));
  return smoothstep(len, 0.0, y) * smoothstep(thin, 0.0, abs(fx)) * on;
}

float snow(vec2 uv, float scale, float spd, float t){
  uv *= scale;
  uv.y += t * spd;
  uv.x += sin(uv.y * 0.9 + t * 0.7) * 0.3 + t * uWind * 0.6;
  vec2 id = floor(uv);
  vec2 f = fract(uv) - 0.5;
  float r = h(id);
  vec2 c = vec2(h(id + 3.1) - 0.5, h(id + 7.7) - 0.5) * 0.6;
  float s = 0.05 + 0.09 * r;
  return smoothstep(s, s * 0.25, length(f - c)) * step(0.3, r);
}

float gust(vec2 uv, float t){
  float y = uv.y * 7.0;
  float row = floor(y);
  float r = h(vec2(row, 1.7));
  float fy = fract(y) - 0.5 + sin(uv.x * 5.0 + t * 1.6 + r * 6.0) * 0.14;
  float x = fract(uv.x * 0.3 - t * (0.35 + 0.35 * r) + r * 5.0);
  float seg = smoothstep(0.0, 0.12, x) * smoothstep(0.6, 0.28, x);
  return seg * smoothstep(0.03, 0.0, abs(fy)) * step(0.5, r);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime;
  float a = 0.0;
  vec3 col = vec3(0.0);
  if (uRain > 0.0) {
    float r = rain(uv, 22.0, 1.9, 0.22, 0.06, t) * 0.42 + rain(uv * 1.0 + 3.0, 40.0, 1.5, 0.16, 0.07, t) * 0.3 + rain(uv + 9.0, 70.0, 1.1, 0.1, 0.08, t) * 0.2;
    r *= uRain;
    col += vec3(0.82, 0.88, 0.97) * r;
    a += r;
  }
  if (uSnow > 0.0) {
    float s = snow(uv, 5.0, 0.18, t) * 0.95 + snow(uv + 2.0, 9.0, 0.13, t) * 0.7 + snow(uv + 5.0, 16.0, 0.09, t) * 0.45;
    s *= uSnow;
    col += vec3(1.0) * s;
    a += s;
  }
  if (uWind > 0.0) {
    float g = (gust(uv, t) * 0.45 + gust(uv * 1.7 + 4.0, t * 1.3) * 0.25) * uWind;
    col += vec3(1.0) * g;
    a += g;
  }
  col *= 1.0 - uNight * 0.55;
  a = clamp(a, 0.0, 0.9);
  gl_FragColor = vec4(col, a);
}`

export default function Precip({ rain, snow, wind, night, running }: { rain: number; snow: number; wind: number; night: number; running: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef({ rain, snow, wind, night, running })
  latest.current = { rain, snow, wind, night, running }

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const gl = cv.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true }) as WebGLRenderingContext | null
    if (!gl) return
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
      console.warn('Weather shader unavailable', e)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n: string) => gl.getUniformLocation(prog, n)
    const u = { res: U('uRes'), time: U('uTime'), rain: U('uRain'), snow: U('uSnow'), wind: U('uWind'), night: U('uNight') }
    let raf = 0
    let last = 0
    const t0 = performance.now()
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const v = latest.current
      if (!v.running && last) return
      if (now - last < 1000 / 40) return
      last = now
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.round(cv.clientWidth * dpr)
      const hh = Math.round(cv.clientHeight * dpr)
      if (cv.width !== w || cv.height !== hh) {
        cv.width = w
        cv.height = hh
      }
      gl.viewport(0, 0, cv.width, cv.height)
      gl.uniform2f(u.res, cv.width, cv.height)
      gl.uniform1f(u.time, (now - t0) / 1000)
      gl.uniform1f(u.rain, v.rain)
      gl.uniform1f(u.snow, v.snow)
      gl.uniform1f(u.wind, v.wind)
      gl.uniform1f(u.night, v.night)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvas} className="gs-precip" aria-hidden />
}
