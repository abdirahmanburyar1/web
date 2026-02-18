"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function CollectorGatePage() {
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.roleType !== "COLLECTOR") {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-slate-200 dark:border-slate-700">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <svg
              className="h-8 w-8 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Use the AquaTrack mobile app
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Collectors record readings and payments in the field using the AquaTrack mobile app. This web portal is for tenant admins and staff.
          </p>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
            Open the AquaTrack app on your phone and log in with your collector account to get started.
          </p>
          <Link href="/login" className="mt-8" onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("portal"); }}>
            <Button variant="secondary">Sign out</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
