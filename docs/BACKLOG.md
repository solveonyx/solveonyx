# Backlog

## Critical Foundation

- Add automated tests for protected routes and permission-gated UI.
- Add tests around `getCurrentUserContext()` behavior.
- Add tests or verification scripts for permission matrix expectations.
- Confirm all protected API routes use server-side permission checks.
- Keep role editing behind `update_tenant_user_role(...)`.
- Document production environment setup once deployment target is selected.

## User Management

- Build Invite User flow.
- Decide invite mechanics: Supabase Auth invite, staged invite table, or hybrid.
- Add remove/deactivate tenant user flow.
- Add user status display and status changes if needed.
- Add clearer success/error feedback for role changes.
- Consider audit logging for role changes and invites.

## Companies Module

- Build Add Company flow.
- Add company edit flow.
- Add company deactivate/delete decision.
- Add server-side permission checks for company writes.
- Decide required company fields.
- Add empty states and validation messages.

## Tenant Administration

- Build tenant settings page for Tenant Admins.
- Add tenant profile fields if needed.
- Add tenant member management polish.
- Decide whether Tenant Admins can configure limited tenant preferences.

## Platform Administration

- Add tenant creation/setup workflow.
- Add tenant edit workflow.
- Add platform-level tenant health/status indicators.
- Add platform admin audit views.
- Keep Platform Admin separate from Tenant Admin in UI and database.

## Deployment

- Choose production hosting target.
- Document environment variables without storing secret values.
- Set up production Supabase project or confirm project strategy.
- Add CI checks for lint/build.
- Add deployment rollback notes.
- Review npm audit findings before production.

## Future Modules

- Reactivate CPQ only when the core SaaS foundation is stable.
- Define CPQ tenant data model before building UI.
- Consider billing only after tenant/user/company workflows are solid.
- Add reporting after core data is reliable.

