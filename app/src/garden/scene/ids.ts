// Unique SVG ids per scene, so several scenes on one page never borrow each other's gradients.
import { createContext, useContext } from 'react'

export const SceneId = createContext('gs')

export function useSid() {
  const p = useContext(SceneId)
  return (name: string) => `${p}-${name}`
}
