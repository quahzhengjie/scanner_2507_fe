// // =================================================================================
// // FILE: src/components/layout/Header.tsx
// // =================================================================================
// 'use client';

// import React, { useState, useEffect } from 'react';
// import Link from 'next/link';
// import Image from 'next/image';
// import { usePathname } from 'next/navigation';
// import {
//     Moon, Sun, Home, Users, Settings, ClipboardList, UserPlus, Menu, X, ListTodo
// } from 'lucide-react';
// import { useTheme } from '@/hooks/useTheme';
// import { useHasPermission } from '@/features/rbac/usePermission';
// import { useEnumStore } from '@/features/enums/useEnumStore';
// import { UserInfoPopover } from '@/components/common/UserInfoPopover';

// const useSessionManager = () => {
//     const [currentUserRole, setCurrentUserRole] = useState('ROLE_MANAGER'); // Default to backend role name
//     const roles = useEnumStore(s => s.roles);
    
//     const setRole = (roleKey: string) => {
//         if (typeof window !== 'undefined') {
//             localStorage.setItem('currentUserRole', roleKey);
//             window.location.reload();
//         }
//     };

//     useEffect(() => {
//         if (typeof window !== 'undefined') {
//             const storedRole = localStorage.getItem('currentUserRole');
//             if (storedRole && roles[storedRole]) {
//                 setCurrentUserRole(storedRole);
//             }
//         }
//     }, [roles]);

//     return { currentUserRole, setRole };
// };

// export function Header() {
//   const { darkMode, toggleDarkMode } = useTheme();
//   const { currentUserRole, setRole } = useSessionManager();
//   const userRoles = useEnumStore(s => s.roles);
//   const pathname = usePathname();
//   const hasPermission = useHasPermission();

//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   const navLinks = [
//     { href: '/', label: 'Dashboard', icon: Home, permission: null },
//     { href: '/my-tasks', label: 'My Tasks', icon: ListTodo, permission: null },
//     { href: '/cases', label: 'Cases', icon: Users, permission: 'case:read' },
//     { href: '/review-queue', label: 'Review Queue', icon: ClipboardList, permission: 'case:approve' },
//     { href: '/templates', label: 'Templates', icon: Settings, permission: 'admin:manage-templates' },
//     { href: '/users', label: 'Users', icon: UserPlus, permission: 'admin:manage-users' },
//   ];
  
//   // Improvement: Filter links before rendering for better security
//   const accessibleNavLinks = navLinks.filter(({ permission }) => 
//     !permission || hasPermission(permission)
//   );

//   const renderNavLinks = (isMobile = false) => {
//     return accessibleNavLinks.map(({ href, label, icon: Icon }) => {
//       const isActive = pathname === href;
      
//       return (
//         <Link
//           key={href}
//           href={href}
//           onClick={() => setIsMobileMenuOpen(false)}
//           className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
//             isActive
//               ? 'bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white'
//               : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
//           } ${isMobile ? 'text-base' : ''}`}
//         >
//           <Icon size={16} />
//           {label}
//         </Link>
//       );
//     });
//   };

//   return (
//     <header className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-slate-900/80 border-gray-200 dark:border-slate-700 backdrop-blur-sm">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-16">
//           <div className="flex items-center gap-8">
//             {/* === LOGO UPDATE START === */}
//             <Link href="/" className="flex items-center">
//               <div className="relative h-8 w-32 min-w-[120px] max-w-[160px]">
//                 {darkMode ? (
//                   <Image
//                     src="/images/logos/Bangkok_Bank_2023_darkmode.svg"
//                     alt="Bangkok Bank Logo"
//                     fill
//                     className="object-contain object-left"
//                     priority
//                   />
//                 ) : (
//                   <Image
//                     src="/images/logos/Bangkok_Bank_2023_lightmode.png"
//                     alt="Bangkok Bank Logo"
//                     fill
//                     className="object-contain object-left"
//                     priority
//                   />
//                 )}
//               </div>
//             </Link>
//             {/* === LOGO UPDATE END === */}
//             <nav className="hidden md:flex items-center gap-1">
//               {renderNavLinks()}
//             </nav>
//           </div>
//           <div className="flex items-center gap-4">
//             <UserInfoPopover 
//               currentUserRole={currentUserRole} 
//               userRoles={userRoles} 
//             />
            
//             <select
//               value={currentUserRole}
//               onChange={(e) => setRole(e.target.value)}
//               className="h-9 text-sm rounded-md border-gray-300 dark:bg-slate-800 dark:border-slate-600 focus:ring-blue-500"
//               aria-label="Select user role"
//             >
//                 {Object.entries(userRoles).map(([key, role]) => (
//                     <option key={key} value={key}>{role.label}</option>
//                 ))}
//             </select>
            
//             <button
//               onClick={toggleDarkMode}
//               className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
//               aria-label={darkMode ? 'Activate light mode' : 'Activate dark mode'}
//             >
//               {darkMode ? <Sun size={20} /> : <Moon size={20} />}
//             </button>
            
//             <div className="md:hidden">
//                 <button 
//                   onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
//                   className="p-2"
//                   aria-label="Toggle mobile menu"
//                 >
//                     {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
//                 </button>
//             </div>
//           </div>
//         </div>
//       </div>
//       {isMobileMenuOpen && (
//         <div className="md:hidden">
//             <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
//                 {renderNavLinks(true)}
//             </nav>
//         </div>
//       )}
//     </header>
//   );
// }
// =================================================================================
// FILE: src/components/layout/Header.tsx
// =================================================================================
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    Moon, Sun, Home, Users, Settings, ClipboardList, UserPlus, Menu, X, ListTodo
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useEnumStore } from '@/features/enums/useEnumStore';
import { UserInfoPopover } from '@/components/common/UserInfoPopover';
import { getUsers } from '@/lib/apiClient';
import type { User } from '@/types/entities';

export function Header() {
  const { darkMode, toggleDarkMode } = useTheme();
  const userRoles = useEnumStore(s => s.roles);
  const pathname = usePathname();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for current role - initialize with default
  const [currentUserRole, setCurrentUserRole] = useState('ROLE_MANAGER');
  
  // Fetch users from backend in development mode
  useEffect(() => {
    const fetchUsers = async () => {
      if (process.env.NODE_ENV === 'development') {
        try {
          setIsLoadingUsers(true);
          const fetchedUsers = await getUsers();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
    };
    
    fetchUsers();
  }, []);
  
  // Only run on client side
  useEffect(() => {
    setIsClient(true);
    
    const storedRole = localStorage.getItem('currentUserRole');
    
    if (storedRole && userRoles[storedRole]) {
      setCurrentUserRole(storedRole);
    }
  }, [userRoles]);

  // Function to check permissions
  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    
    const userRole = userRoles[currentUserRole];
    if (!userRole) return false;
    
    return !!userRole.permissions?.[permission];
  };

  const handleRoleChange = (roleKey: string) => {
    setCurrentUserRole(roleKey);
    localStorage.setItem('currentUserRole', roleKey);
    window.location.reload();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Home, permission: null },
    { href: '/my-tasks', label: 'My Tasks', icon: ListTodo, permission: null },
    { href: '/cases', label: 'Cases', icon: Users, permission: 'case:read' },
    { href: '/review-queue', label: 'Review Queue', icon: ClipboardList, permission: 'case:approve' },
    { href: '/templates', label: 'Templates', icon: Settings, permission: 'admin:manage-templates' },
    { href: '/users', label: 'Users', icon: UserPlus, permission: 'admin:manage-users' },
  ];
  
  // Filter links based on permissions
  const accessibleNavLinks = navLinks.filter(({ permission }) => 
    !permission || hasPermission(permission)
  );

  const renderNavLinks = (isMobile = false) => {
    return accessibleNavLinks.map(({ href, label, icon: Icon }) => {
      const isActive = pathname === href;
      
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
              ? 'bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          } ${isMobile ? 'text-base' : ''}`}
        >
          <Icon size={16} />
          {label}
        </Link>
      );
    });
  };

  // Get current user based on selected role
  const getCurrentUser = () => {
    return users.find(user => user.role === currentUserRole) || null;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-slate-900/80 border-gray-200 dark:border-slate-700 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <div className="relative h-8 w-32 min-w-[120px] max-w-[160px]">
                {darkMode ? (
                  <Image
                    src="/images/logos/Bangkok_Bank_2023_darkmode.svg"
                    alt="Bangkok Bank Logo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                ) : (
                  <Image
                    src="/images/logos/Bangkok_Bank_2023_lightmode.png"
                    alt="Bangkok Bank Logo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                )}
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {renderNavLinks()}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Only render role-dependent content after client-side hydration */}
            {isClient && (
              <>
                <UserInfoPopover 
                  currentUserRole={currentUserRole} 
                  userRoles={userRoles} 
                />
                
                {/* Role Switcher - Shows detailed user information */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                    <span className="text-xs font-bold text-yellow-800 dark:text-yellow-300">DEV</span>
                    {isLoadingUsers ? (
                      <span className="text-xs text-yellow-800 dark:text-yellow-300">Loading users...</span>
                    ) : users.length > 0 ? (
                      <select
                        value={currentUserRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="h-8 text-xs rounded border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700 focus:ring-yellow-500 font-mono min-w-[260px]"
                        aria-label="Select test user"
                      >
                        <optgroup label="Test User Accounts">
                          {users
                            .filter(user => userRoles[user.role]) // Only show users with valid roles
                            .map((user) => {
                              const roleLabel = userRoles[user.role]?.label || user.role;
                              return (
                                <option key={user.userId} value={user.role}>
                                  {user.userId} | {user.email.split('@')[0]} | {roleLabel}
                                </option>
                              );
                            })}
                        </optgroup>
                      </select>
                    ) : (
                      <select
                        value={currentUserRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="h-8 text-xs rounded border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700 focus:ring-yellow-500 font-mono min-w-[200px]"
                        aria-label="Select user role"
                      >
                        <optgroup label="User Roles">
                          {Object.entries(userRoles).map(([key, role]) => (
                            <option key={key} value={key}>{role.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    )}
                    {getCurrentUser() && (
                      <div className="hidden lg:flex items-center text-xs text-yellow-800 dark:text-yellow-300 ml-2">
                        <span className="font-semibold">Current:</span>
                        <span className="ml-1">{getCurrentUser()?.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label={darkMode ? 'Activate light mode' : 'Activate dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {renderNavLinks(true)}
          </nav>
        </div>
      )}
    </header>
  );
}