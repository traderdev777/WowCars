/**
 * WowCars — Role-Based Access Control (RBAC) Least-Privilege Matrix
 * Defines explicit permissions for staff roles and dealer accounts.
 */

import { AdminRole } from "../db/types";

export type PlatformRole = AdminRole | "DEALER" | "SELLER";

export type Permission =
  | "dealers:read"
  | "dealers:verify"
  | "dealers:approve"
  | "dealers:suspend"
  | "dealers:kyc_view"
  | "cars:read"
  | "cars:moderate"
  | "cars:price_update"
  | "enquiries:read"
  | "enquiries:assign"
  | "enquiries:update_status"
  | "enquiries:export"
  | "analytics:read"
  | "users:manage"
  | "locations:manage"
  | "parts:read"
  | "parts:manage"
  | "parts:moderate"
  | "orders:read"
  | "orders:manage"
  // Automotive Operations & Garage Permissions
  | "operations:read"
  | "operations:manage"
  | "suppliers:read"
  | "suppliers:manage"
  | "procurement:read"
  | "procurement:manage"
  | "procurement:approve"
  | "inventory:read"
  | "inventory:manage"
  | "garage:read"
  | "garage:manage"
  | "garage:jobs"
  | "financials:read"
  | "financials:manage"
  | "outlets:read"
  | "outlets:manage";

const ALL_OPERATIONS_PERMISSIONS: Permission[] = [
  "operations:read",
  "operations:manage",
  "suppliers:read",
  "suppliers:manage",
  "procurement:read",
  "procurement:manage",
  "procurement:approve",
  "inventory:read",
  "inventory:manage",
  "garage:read",
  "garage:manage",
  "garage:jobs",
  "financials:read",
  "financials:manage",
  "outlets:read",
  "outlets:manage",
];

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  SUPER_ADMIN: [
    "dealers:read",
    "dealers:verify",
    "dealers:approve",
    "dealers:suspend",
    "dealers:kyc_view",
    "cars:read",
    "cars:moderate",
    "cars:price_update",
    "enquiries:read",
    "enquiries:assign",
    "enquiries:update_status",
    "enquiries:export",
    "analytics:read",
    "users:manage",
    "locations:manage",
    "parts:read",
    "parts:manage",
    "parts:moderate",
    "orders:read",
    "orders:manage",
    ...ALL_OPERATIONS_PERMISSIONS,
  ],
  ADMIN: [
    "dealers:read",
    "dealers:verify",
    "dealers:approve",
    "dealers:suspend",
    "dealers:kyc_view",
    "cars:read",
    "cars:moderate",
    "cars:price_update",
    "enquiries:read",
    "enquiries:assign",
    "enquiries:update_status",
    "enquiries:export",
    "analytics:read",
    "users:manage",
    "locations:manage",
    "parts:read",
    "parts:manage",
    "parts:moderate",
    "orders:read",
    "orders:manage",
    ...ALL_OPERATIONS_PERMISSIONS,
  ],
  OPERATIONS: [
    "dealers:read",
    "dealers:verify",
    "dealers:approve",
    "dealers:suspend",
    "dealers:kyc_view",
    "cars:read",
    "cars:moderate",
    "cars:price_update",
    "enquiries:read",
    "enquiries:assign",
    "enquiries:update_status",
    "enquiries:export",
    "analytics:read",
    "locations:manage",
    "parts:read",
    "parts:manage",
    "parts:moderate",
    "orders:read",
    "orders:manage",
    ...ALL_OPERATIONS_PERMISSIONS,
  ],
  PROCUREMENT_MANAGER: [
    "suppliers:read",
    "suppliers:manage",
    "procurement:read",
    "procurement:manage",
    "procurement:approve",
    "inventory:read",
    "parts:read",
    "operations:read",
  ],
  OUTLET_MANAGER: [
    "operations:read",
    "garage:read",
    "garage:manage",
    "garage:jobs",
    "inventory:read",
    "inventory:manage",
    "procurement:read",
    "procurement:manage",
    "financials:read",
    "orders:read",
    "parts:read",
  ],
  TECHNICIAN: [
    "garage:read",
    "garage:jobs",
    "inventory:read",
  ],
  FRANCHISE_USER: [
    "operations:read",
    "garage:read",
    "garage:jobs",
    "inventory:read",
    "procurement:read",
    "procurement:manage",
    "orders:read",
  ],
  VERIFICATION_OFFICER: [
    "dealers:read",
    "dealers:verify",
    "dealers:approve",
    "dealers:suspend",
    "dealers:kyc_view",
  ],
  MODERATOR: [
    "cars:read",
    "cars:moderate",
    "cars:price_update",
  ],
  CRM_AGENT: [
    "enquiries:read",
    "enquiries:assign",
    "enquiries:update_status",
  ],
  MARKETING_MANAGER: [
    "analytics:read",
    "cars:read",
  ],
  DEALER_MANAGER: [
    "dealers:read",
    "dealers:verify",
    "dealers:approve",
    "cars:read",
    "enquiries:read",
  ],
  SUPPORT: [
    "cars:read",
    "enquiries:read",
    "enquiries:update_status",
  ],
  DEALER: [
    // Dealers have dedicated dealer portal permissions scoped to their dealerId
    "cars:read",
    "enquiries:read",
  ],
  SELLER: [
    // Spare parts sellers have dedicated portal permissions scoped to their sellerId
    "parts:read",
    "parts:manage",
    "orders:read",
  ],
};

/**
 * Checks if a given role possesses a specific permission
 */
export function hasPermission(role: PlatformRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
