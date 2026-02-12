// Permission codes used for RBAC and direct user permissions
export const PERMISSIONS = {
  // Customers
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_EDIT: 'customers:edit',
  CUSTOMERS_DELETE: 'customers:delete',
  // Invoices
  INVOICES_VIEW: 'invoices:view',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_EDIT: 'invoices:edit',
  INVOICES_DELETE: 'invoices:delete',
  // Payments
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_RECORD: 'payments:record',
  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  // Users & roles (tenant admin)
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
  // Meter readings
  METER_READINGS_VIEW: 'meter_readings:view',
  METER_READINGS_RECORD: 'meter_readings:record',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Check if user has permission via role or direct assignment. Tenant admin has all. */
export function userHasPermission(
  user: {
    roleType?: string;
    role?: { permissions: { permission: { code: string } }[] } | null;
    directPermissions?: { permission: { code: string }[] };
  },
  code: PermissionCode
): boolean {
  if (user.roleType === 'TENANT_ADMIN' || user.roleType === 'PLATFORM_ADMIN') return true;
  const roleCodes = user.role?.permissions?.map((p) => p.permission.code) ?? [];
  const directCodes = user.directPermissions?.map((p) => p.permission.code) ?? [];
  const all = new Set([...roleCodes, ...directCodes]);
  return all.has(code);
}
