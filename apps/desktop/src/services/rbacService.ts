import { ModulePermission, UserPermissions, RoleDefinition } from '@sistema-os/shared';

export const DEFAULT_ROLE_PERMISSIONS: Record<'ADMIN' | 'GERENTE' | 'TECNICO' | 'ATENDENTE', UserPermissions> = {
  ADMIN: {
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    financial: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    stock: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    settings: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  GERENTE: {
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financial: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    stock: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    settings: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
  TECNICO: {
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clients: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    financial: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    stock: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  ATENDENTE: {
    orders: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financial: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    stock: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    settings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

const RBAC_STORAGE_KEY = 'vollen_rbac_custom_permissions';

/**
 * Obtém a matriz de permissões para um papel de usuário
 */
export function getPermissionsForRole(role: string): UserPermissions {
  const normRole = (role || 'ATENDENTE').toUpperCase() as keyof typeof DEFAULT_ROLE_PERMISSIONS;
  try {
    const raw = localStorage.getItem(RBAC_STORAGE_KEY);
    if (raw) {
      const customMap = JSON.parse(raw);
      if (customMap[normRole]) {
        return customMap[normRole];
      }
    }
  } catch {}

  return DEFAULT_ROLE_PERMISSIONS[normRole] || DEFAULT_ROLE_PERMISSIONS.ATENDENTE;
}

/**
 * Valida se o usuário logado possui permissão específica
 */
export function hasPermission(
  userRole: string | undefined,
  module: keyof UserPermissions,
  action: keyof ModulePermission
): boolean {
  if (!userRole) return false;
  const roleUpper = userRole.toUpperCase();
  if (roleUpper === 'ADMIN') return true;

  const permissions = getPermissionsForRole(roleUpper);
  const modulePerm = permissions[module];
  return Boolean(modulePerm && modulePerm[action]);
}
