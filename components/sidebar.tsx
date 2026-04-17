"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, Code2, PanelLeftClose, PanelLeftOpen, Rocket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Command", icon: Rocket, href: "/command" },
  { label: "Rooms", icon: Code2, href: "/rooms" },
  { label: "Team", icon: Users, href: "/team" },
  { label: "Timeline", icon: Clock, href: "/timeline" }
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden border-r border-slate-800/70 bg-slate-950/50 px-3 py-5 backdrop-blur-xl transition-all duration-300 lg:block ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-[0_0_32px_rgba(59,130,246,0.32)]">
            <Rocket className="h-5 w-5 text-white" />
          </span>
          {!collapsed ? <span className="text-xl font-black tracking-wide">CodeOrbit</span> : null}
        </Link>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed((value) => !value)} className="px-2">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500/10 hover:text-white ${
              pathname === item.href
                ? "border border-blue-400/40 bg-blue-500/10 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.2)]"
                : ""
            }`}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed ? item.label : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
