import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Iniciar sesión | AkzoNobel CRM" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-akzo-blue-dark via-akzo-blue to-sky-600 px-4 py-12">
      <LoginForm />
    </main>
  );
}
