import Link from "next/link";

export default function EnterTenantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
          <Link href="/" className="font-semibold text-cyan-800">AquaTrack</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Company portal</h1>
          <p className="mt-3 text-sm text-slate-600">
            Companies go directly to their subdomain. There is no tenant selection — your account is tied to one company, and the tenant is determined from your session when you sign in.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Your company will give you the link, for example:
          </p>
          <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
            https://<span className="text-teal-600">your-company</span>.aquatrack.so
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Go to that URL to sign in. Your tenant is selected automatically from your user account (session).
          </p>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="text-cyan-600 hover:underline">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
