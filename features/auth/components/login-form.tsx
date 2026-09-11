"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Droplets, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

import { loginAction } from "../actions";

const initialState: ActionResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Ingresar
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-akzo-blue text-white shadow-lg shadow-akzo-blue/30">
          <Droplets className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-akzo-blue-dark">AkzoNobel</p>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Industrial Coatings · CRM Comercial
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="nombre@akzonobel.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>

        {state && !state.success && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Acceso exclusivo para personal comercial de AkzoNobel Industrial Coatings.
      </p>
    </div>
  );
}
