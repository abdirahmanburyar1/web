"use client";

const CONTACT = {
  name: "Abdirahman Abdillahi Khalif",
  phone: "+252907700949",
  email: "abdirahman.buryar@gmail.com",
};

export function UnregisteredSubdomainContact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-violet-950/50 to-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]" />
      <div className="relative w-full max-w-lg">
        <div className="rounded-3xl border border-amber-500/20 bg-slate-800/50 backdrop-blur-xl shadow-2xl shadow-amber-500/10 overflow-hidden">
          <div className="border-b border-amber-500/10 bg-amber-500/5 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                <svg
                  className="h-6 w-6 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-200">
                  Subdomain not registered
                </h1>
                <p className="text-sm text-slate-400">
                  This company portal is not set up yet. Contact us to get started.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-slate-300 text-center text-sm">
              Want to use AquaTrack for your water supply business? Reach out and we&apos;ll get you set up.
            </p>
            <div className="space-y-4">
              <a
                href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-4 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-4 transition hover:bg-amber-500/10 hover:border-amber-500/30 group"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Phone</p>
                  <p className="font-semibold text-amber-200 truncate">{CONTACT.phone}</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-4 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-4 transition hover:bg-amber-500/10 hover:border-amber-500/30 group"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</p>
                  <p className="font-semibold text-amber-200 truncate">{CONTACT.email}</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-amber-200">{CONTACT.name}</p>
              <p className="text-xs text-amber-200/70 mt-0.5">Contact person</p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          AquaTrack — Water Supplier SaaS
        </p>
      </div>
    </div>
  );
}
