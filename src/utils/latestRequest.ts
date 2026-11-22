export type LatestRequestGate = { begin: () => number; isCurrent: (id: number) => boolean; invalidate: () => void }

export function createLatestRequestGate(): LatestRequestGate {
  let sequence = 0
  return {
    begin: () => ++sequence,
    isCurrent: (id) => id === sequence,
    invalidate: () => { sequence += 1 },
  }
}
