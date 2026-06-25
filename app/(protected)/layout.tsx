import { ActiveTenantProvider } from "@/components/active-tenant-provider"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarMain, SidebarStateProvider } from "@/components/sidebar-state-provider"
import { getCurrentUserContext } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentUserContext()
  const canViewUsers = hasPermission(context, "users.view")

  return (
    <ActiveTenantProvider
      initialActiveTenantId={context.activeTenantId}
      initialActiveTenantName={context.activeTenantName}
      tenantMemberships={context.tenantMemberships}
    >
      <SidebarStateProvider>
        <AppSidebar isPlatformAdmin={context.isPlatformAdmin} canViewUsers={canViewUsers} />
        <SidebarMain header={<AppHeader context={context} />}>{children}</SidebarMain>
      </SidebarStateProvider>
    </ActiveTenantProvider>
  );
}
