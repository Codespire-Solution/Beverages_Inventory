export function Marquee({ items }: { items: string[] }) {
  const line = [...items, ...items]
  return (
    <div className="bg-ink text-white overflow-hidden whitespace-nowrap py-2.5">
      <div className="inline-block animate-marquee font-mono uppercase tracking-[0.18em] text-[11px]">
        {line.map((t, i) => (
          <span key={i}>{t}<span className="text-accent mx-3.5">/</span></span>
        ))}
      </div>
    </div>
  )
}
