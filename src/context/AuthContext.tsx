// =================================================================================
// FILE: src/context/AuthContext.tsx
// =================================================================================
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useEnumStore } from '@/features/enums/useEnumStore';

interface AuthContextType {
  currentUserRole: string;
  setCurrentUserRole: (role: string) => void;
  isAuthenticated: boolean;
  isDevelopment: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState('ROLE_MANAGER');
  const roles = useEnumStore(s => s.roles);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // In development, load role from localStorage
    if (isDevelopment && typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('currentUserRole');
      if (storedRole && roles[storedRole]) {
        setCurrentUserRole(storedRole);
      }
    }
    // In production, this would fetch from your auth API
  }, [isDevelopment, roles]);

  const handleSetRole = (role: string) => {
    setCurrentUserRole(role);
    if (isDevelopment && typeof window !== 'undefined') {
      localStorage.setItem('currentUserRole', role);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        currentUserRole,
        setCurrentUserRole: handleSetRole,
        isAuthenticated: true, // Always true in dev mode
        isDevelopment
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Helper to get permissions for current user
export const useCurrentUserPermissions = () => {
  const { currentUserRole } = useAuth();
  const roles = useEnumStore(s => s.roles);
  
  const roleData = roles[currentUserRole];
  return roleData?.permissions || {};
};