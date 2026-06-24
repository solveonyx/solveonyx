import { ActiveTenantProvider } from "@/components/active-tenant-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { getCurrentUserContext } from "@/lib/auth"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentUserContext()

  return (
    <ActiveTenantProvider
      initialActiveTenantId={context.activeTenantId}
      initialActiveTenantName={context.activeTenantName}
      tenantMemberships={context.tenantMemberships}
    >
      <AppSidebar isPlatformAdmin={context.isPlatformAdmin} />
      <main className="min-h-screen pl-[4.5rem]">{children}</main>
    </ActiveTenantProvider>
  );
}
