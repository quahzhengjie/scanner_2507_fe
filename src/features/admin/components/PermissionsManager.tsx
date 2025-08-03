// =================================================================================
// FILE: src/features/admin/components/PermissionsManager.tsx
// =================================================================================
'use client';

import React, { useMemo, useState } from 'react';
import { Save, RefreshCw, Info } from 'lucide-react';
import type { Role } from '@/types/entities'

interface PermissionsManagerProps {
    userRoles: Record<string, Role>;
    onPermissionChange: (roleName: string, permissionKey: string, value: boolean) => void;
}

// A helper function to format permission keys into readable column headers
const formatPermissionKey = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^can /, '')      // Remove "can " prefix
        .replace(/admin:/, 'Admin: ')
        .replace(/case:/, 'Case: ')
        .replace(/document:/, 'Doc: ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Group permissions by category
const getPermissionCategory = (key: string): string => {
    if (key.startsWith('admin:')) return 'Administration';
    if (key.startsWith('case:')) return 'Case Management';
    if (key.startsWith('document:')) return 'Document Management';
    return 'General';
};

export function PermissionsManager({ userRoles, onPermissionChange }: PermissionsManagerProps) {
    const [hasChanges, setHasChanges] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);

    // Dynamically get all unique permission keys from all roles to create the table columns
    const permissionsByCategory = useMemo(() => {
        const categoryMap = new Map<string, string[]>();
        
        Object.values(userRoles).forEach(role => {
            Object.keys(role.permissions).forEach(key => {
                const category = getPermissionCategory(key);
                if (!categoryMap.has(category)) {
                    categoryMap.set(category, []);
                }
                const keys = categoryMap.get(category)!;
                if (!keys.includes(key)) {
                    keys.push(key);
                }
            });
        });

        // Sort keys within each category
        categoryMap.forEach(keys => keys.sort());
        
        return categoryMap;
    }, [userRoles]);

    const handlePermissionChange = (roleName: string, permissionKey: string, value: boolean) => {
        onPermissionChange(roleName, permissionKey, value);
        setHasChanges(true);
    };

    const handleSaveChanges = async () => {
        setSavingChanges(true);
        // Simulate save - in real implementation, this would call an API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSavingChanges(false);
        setHasChanges(false);
    };

    const handleResetChanges = () => {
        // In real implementation, this would reset to the original values
        setHasChanges(false);
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            {/* Header with action buttons */}
            <div className="flex justify-between items-center p-6 pb-0">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Role Permissions Matrix</h3>
                <div className="flex gap-2">
                    {hasChanges && (
                        <>
                            <button
                                onClick={handleResetChanges}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reset
                            </button>
                            <button
                                onClick={handleSaveChanges}
                                disabled={savingChanges}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={16} />
                                {savingChanges ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Permission Tables by Category */}
            {Array.from(permissionsByCategory.entries()).map(([category, permissions]) => (
                <div key={category} className="rounded-xl border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                        <h4 className="font-medium text-slate-700 dark:text-slate-300">{category}</h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 sticky left-0 z-10 bg-gray-50 dark:bg-slate-900/50">
                                        Role
                                    </th>
                                    {permissions.map(key => (
                                        <th key={key} className="p-4 text-center font-semibold min-w-[120px]">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                                                    {formatPermissionKey(key)}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {Object.entries(userRoles).map(([roleName, roleData]) => (
                                    <tr key={roleName} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium sticky left-0 z-10 bg-white dark:bg-slate-800">
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                                    {roleData.label}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {roleName}
                                                </div>
                                            </div>
                                        </td>
                                        {permissions.map(permissionKey => (
                                            <td key={permissionKey} className="p-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={!!roleData.permissions[permissionKey]}
                                                        onChange={(e) => handlePermissionChange(roleName, permissionKey, e.target.checked)}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                                                </label>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Info notice */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">About Permissions</p>
                    <p>
                        Permission changes are saved to the database and will persist across sessions. 
                        Changes take effect immediately for all users with the modified role.
                    </p>
                </div>
            </div>
        </div>
    );
}