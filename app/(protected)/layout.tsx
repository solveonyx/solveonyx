import { AppSidebar } from "@/components/app-sidebar"
import { getCurrentUserContext } from "@/lib/auth"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentUserContext()

  return (
    <>
      <AppSidebar
        activeTenantName={context.activeTenantName}
        isPlatformAdmin={context.isPlatformAdmin}
      />
      <main className="min-h-screen pl-[4.5rem]">{children}</main>
    </>
  );
}
