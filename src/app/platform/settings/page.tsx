"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Settings are for tenants only; platform admin has no settings. Redirect to dashboard. */
export default function PlatformSettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/platform/dashboard");
  }, [router]);
  return null;
}
