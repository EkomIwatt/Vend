import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen px-4 py-16 flex items-center justify-center">
      <div className="max-w-sm text-center">
        <p className="text-xs uppercase tracking-widest text-ink-muted">
          Verification
        </p>
        <h1 className="font-serif text-3xl text-ink mt-2">Receipt not found</h1>
        <p className="text-sm text-ink-muted mt-4">
          This verification code doesn&apos;t match any receipt we&apos;ve
          issued. Double-check the link from your email — codes are six
          characters, uppercase letters and digits only.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm text-primary font-medium hover:underline"
        >
          Back to Vend
        </Link>
      </div>
    </main>
  )
}
