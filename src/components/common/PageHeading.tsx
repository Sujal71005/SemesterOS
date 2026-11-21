type PageHeadingProps = { eyebrow: string; title: string; description: string }

export default function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <div className="mb-7">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h1>
      <p className="mt-1.5 text-sm text-slate-400">{description}</p>
    </div>
  )
}
