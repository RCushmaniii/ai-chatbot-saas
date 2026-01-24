/**
 * Converso Role-Based Permissions System
 *
 * Defines what each role can do within a business/organization.
 */

export type MembershipRole = "owner" | "admin" | "member";

export type Permission =
  // Billing
  | "billing:manage"
  | "billing:view"
  // Business
  | "business:delete"
  | "business:settings"
  // Team
  | "team:invite"
  | "team:remove"
  | "team:change-role"
  | "team:view"
  // Bots
  | "bot:create"
  | "bot:delete"
  | "bot:configure"
  | "bot:view"
  // Knowledge Base
  | "knowledge:manage"
  | "knowledge:view"
  // Analytics
  | "analytics:view"
  // Chat
  | "chat:use";

/**
 * Permission matrix for each role
 */
export const permissions: Record<MembershipRole, Permission[]> = {
  owner: [
    // Full control
    "billing:manage",
    "billing:view",
    "business:delete",
    "business:settings",
    "team:invite",
    "team:remove",
    "team:change-role",
    "team:view",
    "bot:create",
    "bot:delete",
    "bot:configure",
    "bot:view",
    "knowledge:manage",
    "knowledge:view",
    "analytics:view",
    "chat:use",
  ],
  admin: [
    // Everything except billing management and business deletion
    "billing:view",
    "business:settings",
    "team:invite",
    "team:remove",
    "team:view",
    "bot:create",
    "bot:configure",
    "bot:view",
    "knowledge:manage",
    "knowledge:view",
    "analytics:view",
    "chat:use",
  ],
  member: [
    // Basic access
    "bot:configure", // own bots only
    "bot:view",
    "knowledge:view",
    "chat:use",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: MembershipRole,
  permission: Permission
): boolean {
  return permissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: MembershipRole): Permission[] {
  return permissions[role] ?? [];
}

/**
 * Check if a role can perform an action on another role
 * (e.g., can an admin change a member's role?)
 */
export function canManageRole(
  actorRole: MembershipRole,
  targetRole: MembershipRole
): boolean {
  const roleHierarchy: Record<MembershipRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  // Can only manage roles below your level (owners can manage all, admins can manage members)
  return roleHierarchy[actorRole] > roleHierarchy[targetRole];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(
  role: MembershipRole,
  locale: "en" | "es" = "es"
): string {
  const names: Record<MembershipRole, { en: string; es: string }> = {
    owner: { en: "Owner", es: "Propietario" },
    admin: { en: "Admin", es: "Administrador" },
    member: { en: "Member", es: "Miembro" },
  };

  return names[role][locale];
}
