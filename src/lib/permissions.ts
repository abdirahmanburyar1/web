// Permission codes used for RBAC and direct user permissions
// Grouped by module: Operations, Billing, Financial, Workforce, Customers, Analytics, Compliance, Setup, Admin
export const PERMISSIONS = {
  // ---- Operations ----
  METERS_VIEW: 'meters:view',
  METERS_CREATE: 'meters:create',
  METERS_EDIT: 'meters:edit',
  METERS_DELETE: 'meters:delete',
  METER_READINGS_VIEW: 'meter_readings:view',
  METER_READINGS_RECORD: 'meter_readings:record',
  OPERATIONS_ZONES_VIEW: 'operations:zones_view',
  OPERATIONS_ZONES_MANAGE: 'operations:zones_manage',
  OPERATIONS_READING_CYCLES_VIEW: 'operations:reading_cycles_view',
  OPERATIONS_READING_CYCLES_MANAGE: 'operations:reading_cycles_manage',
  OPERATIONS_BULK_IMPORT: 'operations:bulk_import',
  OPERATIONS_AUDIT_VIEW: 'operations:audit_view',
  // ---- Billing & Revenue ----
  INVOICES_VIEW: 'invoices:view',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_EDIT: 'invoices:edit',
  INVOICES_DELETE: 'invoices:delete',
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_RECORD: 'payments:record',
  BILLING_DISCOUNTS_MANAGE: 'billing:discounts_manage',
  BILLING_PENALTIES_MANAGE: 'billing:penalties_manage',
  BILLING_REVENUE_VIEW: 'billing:revenue_view',
  // ---- Financial Management ----
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_EXPENSES_MANAGE: 'financial:expenses_manage',
  FINANCIAL_PAYABLES_MANAGE: 'financial:payables_manage',
  FINANCIAL_RECEIVABLES_MANAGE: 'financial:receivables_manage',
  FINANCIAL_VENDORS_MANAGE: 'financial:vendors_manage',
  FINANCIAL_BUDGET_MANAGE: 'financial:budget_manage',
  FINANCIAL_REPORTS_VIEW: 'financial:reports_view',
  // ---- Workforce ----
  WORKFORCE_VIEW: 'workforce:view',
  WORKFORCE_COLLECTORS_MANAGE: 'workforce:collectors_manage',
  WORKFORCE_COMMISSIONS_MANAGE: 'workforce:commissions_manage',
  WORKFORCE_PERFORMANCE_VIEW: 'workforce:performance_view',
  // ---- Customer Management ----
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_COMPLAINTS_VIEW: 'customers:complaints_view',
  CUSTOMERS_COMPLAINTS_MANAGE: 'customers:complaints_manage',
  CUSTOMERS_SERVICE_REQUESTS_VIEW: 'customers:service_requests_view',
  CUSTOMERS_SERVICE_REQUESTS_MANAGE: 'customers:service_requests_manage',
  // ---- Analytics ----
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  // ---- Compliance & Audit ----
  COMPLIANCE_VIEW: 'compliance:view',
  COMPLIANCE_EXPORT: 'compliance:export',
  // ---- Reports (legacy / general) ----
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  // ---- Setup / Platform Config ----
  SETUP_VIEW: 'setup:view',
  SETUP_TARIFFS_MANAGE: 'setup:tariffs_manage',
  SETUP_BILLING_RULES_MANAGE: 'setup:billing_rules_manage',
  SETUP_BRANDING_MANAGE: 'setup:branding_manage',
  // ---- Administration ----
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Check if user has permission via role or direct assignment. Tenant admin has all. */
export function userHasPermission(
  user: {
    roleType?: string;
    role?: { permissions: { permission: { code: string } }[] } | null;
    directPermissions?: Array<{ permission: { code: string } }>;
  },
  code: PermissionCode
): boolean {
  if (user.roleType === 'TENANT_ADMIN' || user.roleType === 'PLATFORM_ADMIN') return true;
  const roleCodes = user.role?.permissions?.map((p) => p.permission.code) ?? [];
  const directCodes = user.directPermissions?.map((p) => p.permission.code) ?? [];
  const all = new Set([...roleCodes, ...directCodes]);
  return all.has(code);
}
