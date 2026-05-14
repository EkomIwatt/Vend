import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-semibold text-primary tracking-tight">Vend</h1>
          <p className="mt-3 text-ink-muted">
            A financial operating system for Nigeria&apos;s campus micro-merchants.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-md font-medium transition-colors"
          >
            Start selling on Vend
          </Link>
          <Link
            href="/login"
            className="block w-full bg-white border border-line text-ink py-3 rounded-md font-medium hover:border-ink-muted transition-colors"
          >
            I already have an account
          </Link>
        </div>

        <p className="text-xs text-ink-muted">
          Built for the Squad Hackathon 3.0
        </p>
      </div>
    </main>
  )
}
