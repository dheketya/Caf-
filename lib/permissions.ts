import { Role } from '@prisma/client'

export type Module =
  | 'pos'
  | 'products'
  | 'stock'
  | 'income'
  | 'reports'
  | 'reports_full'
  | 'export'
  | 'users'
  | 'billing'
  | 'settings'
  | 'chat'
  | 'kitchen'
  | 'admin'

// Which roles can access which modules
const roleModuleAccess: Record<Role, Module[]> = {
  PLATFORM_OWNER: [
    'pos', 'products', 'stock', 'income', 'reports', 'reports_full',
    'export', 'users', 'billing', 'settings', 'chat', 'kitchen', 'admin',
  ],
  SHOP_OWNER: [
    'pos', 'products', 'stock', 'income', 'reports', 'reports_full',
    'export', 'users', 'billing', 'settings', 'chat',
  ],
  MANAGER: [
    'pos', 'products', 'stock', 'income', 'reports', 'reports_full',
    'export', 'chat',
  ],
  CASHIER: ['pos', 'stock'],
  KITCHEN: ['kitchen'],
}

export function hasModuleAccess(role: Role, module: Module): boolean {
  return roleModuleAccess[role]?.includes(module) ?? false
}

export function canApplyDiscount(role: Role): boolean {
  return ['PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER'].includes(role)
}

export function canVoidSale(role: Role): boolean {
  return ['PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER'].includes(role)
}

export function canManageUsers(role: Role): boolean {
  return ['PLATFORM_OWNER', 'SHOP_OWNER'].includes(role)
}

export function canEditStock(role: Role): boolean {
  return ['PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER'].includes(role)
}

// Check if a module is available on a given plan's module list
export function isPlanModuleEnabled(planModules: string[], module: Module): boolean {
  return planModules.includes(module)
}
