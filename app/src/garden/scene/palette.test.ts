import { describe, expect, it } from 'vitest'
import { moonArc, sunArc } from './palette'

describe('sky', () => {
  it('never shows the sun and the moon at the same time', () => {
    for (let h = 0; h < 24; h += 0.05) expect(sunArc(h) !== null && moonArc(h) !== null).toBe(false)
  })
})
