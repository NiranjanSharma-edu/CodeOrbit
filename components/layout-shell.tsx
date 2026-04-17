"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

const sidebarRoutes = ["/dashboard", "/command", "/rooms", "/team", "/timeline"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = sidebarRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F14] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[auto_1fr]">
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
