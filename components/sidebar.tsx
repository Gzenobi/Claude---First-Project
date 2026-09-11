"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Kanban,
  ClipboardList,
  ShieldCheck,
  Droplets,
  UploadCloud,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "sales_user"] },
  { href: "/clients", label: "Clientes", icon: Building2, roles: ["admin", "sales_user"] },
  { href: "/projects", label: "Proyectos", icon: Kanban, roles: ["admin", "sales_user"] },
  { href: "/activities", label: "Actividades", icon: ClipboardList, roles: ["admin", "sales_user"] },
  { href: "/admin", label: "Dashboard Ejecutivo", icon: ShieldCheck, roles: ["admin"] },
  { href: "/admin/import", label: "Importar datos", icon: UploadCloud, roles: ["admin"] },
] as const;

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-akzo-blue text-white">
          <Droplets className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-akzo-blue-dark">AkzoNobel</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Industrial Coatings
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(role)).map(
          (item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-akzo-blue text-white shadow-sm"
                    : "text-slate-600 hover:bg-akzo-gray-light hover:text-akzo-blue-dark",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          },
        )}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          CRM Comercial · Industrial Coatings
          <br />© {new Date().getFullYear()} AkzoNobel
        </p>
      </div>
    </aside>
  );
}
