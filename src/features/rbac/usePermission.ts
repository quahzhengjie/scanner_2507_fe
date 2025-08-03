// =================================================================================
// FILE: src/features/rbac/usePermission.ts
// =================================================================================
'use client';

import { useEnumStore } from '@/features/enums/useEnumStore';
import { useState, useEffect } from 'react';

// Get the session in a hydration-safe way
const useSession = () => {
  const [session, setSession] = useState({
    user: { 
      name: 'Development User', 
      role: 'ROLE_MANAGER' 
    }
  });

  useEffect(() => {
    // Only access localStorage on client side
    const storedRole = localStorage.getItem('currentUserRole') || 'ROLE_MANAGER';
    setSession({
      user: { 
        name: 'Development User', 
        role: storedRole 
      }
    });
  }, []);

  return session;
};

// Returns a function that checks permissions
export const useHasPermission = () => {
  const roles = useEnumStore((s) => s.roles);
  const session = useSession();
  
  return (permission?: string): boolean => {
    // If no permission specified, allow access
    if (!permission) return true;
    
    if (!session?.user?.role) return false;
    
    const userRole = roles[session.user.role];
    if (!userRole) return false;
    
    return !!userRole.permissions?.[permission];
  };
};

// Helper hook to get current user info
export const useCurrentUser = () => {
  const session = useSession();
  const roles = useEnumStore((s) => s.roles);
  
  const role = session?.user?.role || 'ROLE_MANAGER';
  const roleData = roles[role];
  
  return {
    name: session?.user?.name || 'Unknown User',
    role: role,
    roleLabel: roleData?.label || role,
    permissions: roleData?.permissions || {}
  };
};