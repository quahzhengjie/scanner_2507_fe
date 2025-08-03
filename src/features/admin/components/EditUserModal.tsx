// =================================================================================
// FILE: src/features/admin/components/EditUserModal.tsx
// =================================================================================
'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { User, Role } from '@/types/entities';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (userId: string, userData: Partial<User>) => void;
  user: User | null;
  userRoles: Record<string, Role>;
  isLoading?: boolean;
}

export function EditUserModal({ isOpen, onClose, onUpdate, user, userRoles, isLoading }: EditUserModalProps) {
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        role: '',
        department: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.name?.trim()) {
            newErrors.name = 'Name is required';
        }
        
        if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        onUpdate(user.userId, formData);
    };

    const handleClose = () => {
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="p-8 rounded-xl border w-full max-w-md bg-white dark:bg-slate-800 dark:border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit User</h3>
                    <button 
                        onClick={handleClose} 
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        disabled={isLoading}
                    >
                        <X size={16} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            User ID
                        </label>
                        <input 
                            type="text" 
                            value={user.userId} 
                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 border-gray-300 dark:border-slate-600 opacity-50 cursor-not-allowed"
                            disabled
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 transition-colors ${
                                errors.name 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="email" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 transition-colors ${
                                errors.email 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Department
                        </label>
                        <input 
                            type="text" 
                            value={formData.department} 
                            onChange={e => setFormData({...formData, department: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={formData.role} 
                            onChange={e => setFormData({...formData, role: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                            disabled={isLoading}
                        >
                            {Object.entries(userRoles).map(([key, role]) => (
                                <option key={key} value={role.label}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={handleClose} 
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Update User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}