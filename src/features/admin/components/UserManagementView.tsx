// =================================================================================
// FILE: src/features/admin/components/UserManagementView.tsx
// =================================================================================
'use client';

import React, { useState } from 'react';
import { UserPlus, CheckCircle, XCircle, Users, Lock, AlertCircle, Edit2, Shield } from 'lucide-react';
import type { Role } from '@/types/entities';
import type { User } from '@/types/entities';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { PermissionsManager } from './PermissionsManager';
import { RoleManagementTab } from './RoleManagementTab';
import { createUser, updateUserStatus, updateUser, updateRolePermissions } from '@/lib/apiClient';

interface UserManagementViewProps {
    initialUsers: User[];
    userRoles: Record<string, Role>;
}

export function UserManagementView({ initialUsers, userRoles: initialRoles }: UserManagementViewProps) {
    const [users, setUsers] = useState(initialUsers);
    const [userRoles, setUserRoles] = useState(initialRoles);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'roles'>('users');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddUser = async (newUserData: Omit<User, 'userId' | 'isActive'>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Find the role name from the label
            const roleEntry = Object.entries(userRoles).find(([, role]) => role.label === newUserData.role);
            const roleName = roleEntry ? roleEntry[0] : newUserData.role;
            
            // Pass the role name to the API
            const userToCreate = {
                ...newUserData,
                role: roleName // This will be like "ROLE_MANAGER"
            };
            
            const newUser = await createUser(userToCreate);
            if (newUser) { 
                setUsers(prev => [newUser, ...prev]); 
                setIsAddModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            setError(error instanceof Error ? error.message : 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Convert role label to role name if needed
            const updateData = { ...userData };
            if (userData.role) {
                const roleEntry = Object.entries(userRoles).find(([, role]) => role.label === userData.role);
                if (roleEntry) {
                    updateData.role = roleEntry[0]; // Use role name like "ROLE_MANAGER"
                }
            }
            
            const updatedUser = await updateUser(userId, updateData);
            if (updatedUser) {
                setUsers(prev => prev.map(u => u.userId === userId ? updatedUser : u));
                setIsEditModalOpen(false);
                setSelectedUser(null);
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            setError(error instanceof Error ? error.message : 'Failed to update user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        setError(null);
        
        try {
            const updatedUser = await updateUserStatus(userId, !currentStatus);
            if (updatedUser) { 
                setUsers(prev => prev.map(u => u.userId === userId ? updatedUser : u)); 
            }
        } catch (error) {
            console.error('Failed to update user status:', error);
            setError(error instanceof Error ? error.message : 'Failed to update user status');
        }
    };

    const handlePermissionChange = async (roleName: string, permissionKey: string, value: boolean) => {
        // Update the local state immediately for responsiveness
        setUserRoles(currentRoles => {
            const newRoles = JSON.parse(JSON.stringify(currentRoles));
            if(newRoles[roleName]) {
                newRoles[roleName].permissions[permissionKey] = value;
            }
            return newRoles;
        });

        // Try to update on the backend
        try {
            await updateRolePermissions(roleName, { [permissionKey]: value });
        } catch (error) {
            console.error('Failed to update permissions:', error);
            setError(error instanceof Error ? error.message : 'Failed to update permissions');
            // Revert the change on error
            setUserRoles(initialRoles);
        }
    };

    const TabButton = ({ tabId, label, icon: Icon }: { tabId: 'users' | 'permissions' | 'roles', label: string, icon: React.ElementType }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tabId
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <>
            <AddUserModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onAdd={handleAddUser} 
                userRoles={userRoles}
                isLoading={isLoading}
            />
            
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                onUpdate={handleUpdateUser}
                user={selectedUser}
                userRoles={userRoles}
                isLoading={isLoading}
            />
            
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User & Role Management</h1>
                    {activeTab === 'users' && (
                        <button 
                            onClick={() => setIsAddModalOpen(true)} 
                            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <UserPlus size={16}/> Add User
                        </button>
                    )}
                </div>

                {error && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                )}
                
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="flex -mb-px">
                        <TabButton tabId="users" label="Users" icon={Users} />
                        <TabButton tabId="permissions" label="Permissions" icon={Lock} />
                        <TabButton tabId="roles" label="Roles" icon={Shield} />
                    </nav>
                </div>

                {activeTab === 'users' && (
                    <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Name</th>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Email</th>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Department</th>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Role</th>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {users.map(user => (
                                        <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{user.name}</td>
                                            <td className="p-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                                            <td className="p-4 text-gray-600 dark:text-gray-400">{user.department || '-'}</td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full">
                                                    {userRoles[user.role]?.label || user.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    user.isActive 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleEditUser(user)} 
                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        disabled={isLoading}
                                                    >
                                                        <Edit2 size={14} className="inline mr-1" />
                                                        Edit
                                                    </button>
                                                    <span className="text-gray-300 dark:text-slate-600">|</span>
                                                    <button 
                                                        onClick={() => handleToggleUserStatus(user.userId, user.isActive)} 
                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        disabled={isLoading}
                                                    >
                                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                                No users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'permissions' && (
                    <PermissionsManager 
                        userRoles={userRoles} 
                        onPermissionChange={handlePermissionChange} 
                    />
                )}

                {activeTab === 'roles' && (
                    <RoleManagementTab 
                        userRoles={userRoles} 
                        onRolesUpdate={setUserRoles}
                    />
                )}
            </div>
        </>
    );
}