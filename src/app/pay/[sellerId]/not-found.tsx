import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Vend
        </p>
        <h1 className="font-serif text-3xl mt-2">This payment page doesn&apos;t exist</h1>
        <p className="text-ink-muted mt-3">
          The seller may have closed their account, or the link was mistyped.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-primary hover:underline text-sm"
        >
          ← Back to Vend
        </Link>
      </div>
    </main>
  )
}
