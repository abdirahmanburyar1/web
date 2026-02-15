"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function PlatformSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Platform settings"
        description="Global platform configuration and preferences."
      />
      <Card>
        <CardContent className="pt-6">
          <p className="text-slate-600">
            Platform-wide settings (e.g. defaults, branding, notifications) can be managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
