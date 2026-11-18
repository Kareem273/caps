import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'RECEPTIONIST' | 'FINANCIAL_AUDITOR';

export interface RolePermissions {
  canViewFinancials: boolean;
  canVerifyPayments: boolean;
  canManageSlots: boolean;
  canCheckInPlayers: boolean;
  canManageCourts: boolean;
  canExportReports: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  SUPER_ADMIN: {
    canViewFinancials: true,
    canVerifyPayments: true,
    canManageSlots: true,
    canCheckInPlayers: true,
    canManageCourts: true,
    canExportReports: true,
  },
  RECEPTIONIST: {
    canViewFinancials: false,
    canVerifyPayments: false,
    canManageSlots: true,
    canCheckInPlayers: true,
    canManageCourts: false,
    canExportReports: false,
  },
  FINANCIAL_AUDITOR: {
    canViewFinancials: true,
    canVerifyPayments: true,
    canManageSlots: false,
    canCheckInPlayers: false,
    canManageCourts: false,
    canExportReports: true,
  },
};

interface RbacContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: RolePermissions;
  roleLabels: Record<UserRole, { ar: string; en: string }>;
}

const RbacContext = createContext<RbacContextType | undefined>(undefined);

export function RbacProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('yalla-staff-rbac-role');
    return (saved as UserRole) || 'SUPER_ADMIN';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('yalla-staff-rbac-role', newRole);
  };

  const roleLabels: Record<UserRole, { ar: string; en: string }> = {
    SUPER_ADMIN: { ar: 'مدير النظام (Super Admin)', en: 'Super Admin' },
    RECEPTIONIST: { ar: 'موظف الاستقبال (Receptionist)', en: 'Venue Attendant' },
    FINANCIAL_AUDITOR: { ar: 'المدقق المالي (Auditor)', en: 'Financial Auditor' },
  };

  return (
    <RbacContext.Provider
      value={{
        role,
        setRole,
        permissions: ROLE_PERMISSIONS[role],
        roleLabels,
      }}
    >
      {children}
    </RbacContext.Provider>
  );
}

export function useRbac() {
  const context = useContext(RbacContext);
  if (!context) {
    throw new Error('useRbac must be used within an RbacProvider');
  }
  return context;
}
