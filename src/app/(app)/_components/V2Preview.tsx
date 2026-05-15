/**
 * Shared preview for surfaces that are part of Vend's roadmap but not in
 * the hackathon build. Honest framing: not "coming soon" with a placeholder,
 * but a short paragraph on what the surface becomes and why it's separate
 * from the MVP. Judges who click here learn product depth, not encounter
 * lorem ipsum.
 */

import Link from 'next/link'

type Bullet = { label: string; detail: string }

type Props = {
  title: string
  tagline: string
  paragraphs: string[]
  capabilities: Bullet[]
  shipsWhen: string
}

export default function V2Preview({
  title,
  tagline,
  paragraphs,
  capabilities,
  shipsWhen,
}: Props) {
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Vend Roadmap
        </p>
        <h1 className="font-serif text-3xl tracking-tight mt-1.5">{title}</h1>
        <p className="text-ink-muted mt-1">{tagline}</p>
        <p className="inline-block mt-3 text-xs uppercase tracking-wide bg-line text-ink-muted px-2 py-0.5 rounded font-medium">
          {shipsWhen}
        </p>
      </header>

      <section className="bg-white border border-line rounded-lg p-6 space-y-4 text-sm leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <section>
        <h2 className="font-semibold mb-3">What ships in this surface</h2>
        <ul className="space-y-2.5">
          {capabilities.map((c) => (
            <li
              key={c.label}
              className="flex items-start gap-3 bg-white border border-line rounded-md p-4"
            >
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">{c.label}</p>
                <p className="text-sm text-ink-muted mt-0.5">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-ink-muted">
        This page describes a future Vend surface. The seven-step demo loop
        you&apos;re reviewing today proves the underlying rails. See the{' '}
        <Link href="/dashboard" className="text-primary underline">
          dashboard
        </Link>{' '}
        for the working build.
      </footer>
    </div>
  )
}
