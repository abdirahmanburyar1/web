import { PlatformLayoutClient } from "@/components/platform/platform-layout-client";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformLayoutClient>{children}</PlatformLayoutClient>;
}
