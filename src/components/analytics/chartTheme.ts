export const chartColors = {
  grid: 'rgba(255,255,255,.06)',
  axis: '#8793a8',
  tooltip: {
    backgroundColor: '#0d1421',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 9,
    color: '#e2e8f0',
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  },
  tooltipLabel: { color: '#f1f5f9', fontWeight: 600 },
  tooltipItem: { color: '#cbd5e1' },
  blue: '#76aaff',
  green: '#62d6a4',
  amber: '#e8b65c',
  violet: '#ad92ff',
  slate: '#46536a',
  rose: '#f18491',
} as const

export function lineMarkers(color: string) {
  return {
    dot: false as const,
    activeDot: { r: 5.5, fill: color, stroke: '#0d1421', strokeWidth: 2 },
  }
}
