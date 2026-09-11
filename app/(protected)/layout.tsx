import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen bg-akzo-gray-light">
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
