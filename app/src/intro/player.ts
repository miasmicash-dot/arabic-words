// The player's name (asked once, on the very first launch) and a tiny signal for when the opening intro is over.

const KEY = 'player-name'

export function getPlayerName(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').trim()
  } catch {
    return ''
  }
}

export function setPlayerName(name: string) {
  try {
    localStorage.setItem(KEY, name.trim().slice(0, 30))
  } catch {
    /* ignore */
  }
}

/** "Sara" -> "Sara's Garden", "James" -> "James' Garden" */
export function gardenTitle(name: string): string {
  if (!name) return 'Your Garden'
  return /s$/i.test(name) ? `${name}' Garden` : `${name}'s Garden`
}

let introOver = false
const waiting: (() => void)[] = []

export function finishIntro() {
  introOver = true
  waiting.splice(0).forEach((f) => f())
}

/** Runs `f` once the intro has finished (straight away if it already has). Returns an unsubscribe function. */
export function afterIntro(f: () => void): () => void {
  if (introOver) {
    f()
    return () => {}
  }
  waiting.push(f)
  return () => {
    const i = waiting.indexOf(f)
    if (i >= 0) waiting.splice(i, 1)
  }
}
