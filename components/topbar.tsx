import { LogOut, User as UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import { initials } from "@/lib/utils";
import type { Profile } from "@/types";

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
      <div className="md:hidden">
        <p className="text-sm font-bold text-akzo-blue-dark">AkzoNobel CRM</p>
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">
        {profile.role === "admin" ? "Panel de Gerencia Comercial" : "Panel Comercial"}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-full border border-border py-1 pl-1 pr-3 transition-colors hover:bg-akzo-gray-light">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initials(profile.fullName)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {profile.fullName}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{profile.fullName}</span>
              <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            {profile.role === "admin" ? "Administrador" : "Usuario comercial"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start px-2 font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
