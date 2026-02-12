import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold text-cyan-800">
            AquaTrack
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/platform/login"
              className="text-slate-600 hover:text-cyan-700 font-medium"
            >
              Platform Admin
            </Link>
            <Link
              href="/enter"
              className="text-slate-600 hover:text-cyan-700 font-medium"
            >
              Tenant Portal
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Water supplier SaaS platform
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Multi-tenant billing, collections, and meter readings. Platform admin manages
          tenants and revenue; tenant admin manages users and operations.
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/platform/login"
            className="rounded-xl bg-cyan-600 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-600/25 hover:bg-cyan-700"
          >
            Platform Admin Portal
          </Link>
          <Link
            href="/enter"
            className="rounded-xl border-2 border-cyan-600 bg-white px-6 py-3 font-medium text-cyan-700 hover:bg-cyan-50"
          >
            Tenant Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
