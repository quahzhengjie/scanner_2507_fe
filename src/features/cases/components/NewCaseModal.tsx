import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Building2, FileText, MapPin, Hash } from 'lucide-react';
import { getDocumentRequirements } from '@/lib/apiClient';
import type { CaseCreationData } from '@/types/entities';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CaseCreationData) => void;
}

interface FormData {
  // Basic Information
  entityName: string;
  entityType: string;
  basicNumber: string;
  cisNumber: string;
  taxId: string;
  
  // Address Information
  address1: string;
  address2: string;
  addressCountry: string;
  placeOfIncorporation: string;
  
  // Risk Assessment
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Prospect' | 'KYC Review';
  
  // Additional Information
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  businessActivity: string;
}

export function NewCaseModal({ isOpen, onClose, onCreate }: NewCaseModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'risk'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [isLoadingEntityTypes, setIsLoadingEntityTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    // Basic Information
    entityName: '',
    entityType: '',
    basicNumber: '',
    cisNumber: '',
    taxId: '',
    
    // Address Information
    address1: '',
    address2: '',
    addressCountry: 'Singapore',
    placeOfIncorporation: 'Singapore',
    
    // Risk Assessment
    riskLevel: 'Low',
    status: 'Prospect',
    
    // Additional Information
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    businessActivity: ''
  });

  // Fetch entity types from document requirements
  useEffect(() => {
    const fetchEntityTypes = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoadingEntityTypes(true);
        const requirements = await getDocumentRequirements();
        const types = Object.keys(requirements.entityTemplates || {});
        setEntityTypes(types);
        
        if (types.length > 0 && !formData.entityType) {
          setFormData(prev => ({ ...prev, entityType: types[0] }));
        }
      } catch (error) {
        console.error('Failed to fetch entity types:', error);
        setEntityTypes(['Non-Listed Company', 'Listed Company', 'Partnership', 'Trust Account']);
        if (!formData.entityType) {
          setFormData(prev => ({ ...prev, entityType: 'Non-Listed Company' }));
        }
      } finally {
        setIsLoadingEntityTypes(false);
      }
    };
    
    fetchEntityTypes();
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form after a short delay to avoid visual glitches
      const timer = setTimeout(() => {
        setFormData({
          entityName: '',
          entityType: entityTypes[0] || '',
          basicNumber: '',
          cisNumber: '',
          taxId: '',
          address1: '',
          address2: '',
          addressCountry: 'Singapore',
          placeOfIncorporation: 'Singapore',
          riskLevel: 'Low',
          status: 'Prospect',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          businessActivity: ''
        });
        setErrors({});
        setActiveTab('basic');
        setIsSubmitting(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, entityTypes]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateBasicInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.entityName.trim()) {
      newErrors.entityName = 'Entity name is required';
    }
    
    if (!formData.basicNumber.trim()) {
      newErrors.basicNumber = 'Basic Number is required';
    } else if (!/^[0-9]{6}$/.test(formData.basicNumber)) {
      newErrors.basicNumber = 'Basic Number must be exactly 6 digits';
    }
    
    if (!formData.taxId.trim()) {
      newErrors.taxId = 'Tax ID is required';
    }
    
    return newErrors;
  };

  const validateAddressInfo = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.address1.trim()) {
      newErrors.address1 = 'Primary address is required';
    }
    
    if (!formData.addressCountry.trim()) {
      newErrors.addressCountry = 'Country is required';
    }
    
    if (!formData.placeOfIncorporation.trim()) {
      newErrors.placeOfIncorporation = 'Place of incorporation is required';
    }
    
    // Optional email validation if provided
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate all sections
    const basicErrors = validateBasicInfo();
    const addressErrors = validateAddressInfo();
    const allErrors = { ...basicErrors, ...addressErrors };
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (Object.keys(basicErrors).length > 0) {
        setActiveTab('basic');
      } else if (Object.keys(addressErrors).length > 0) {
        setActiveTab('address');
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Transform data to match backend CaseCreationRequest format
      const caseData: CaseCreationData = {
        entityName: formData.entityName.trim(),
        entityType: formData.entityType,
        riskLevel: formData.riskLevel,
        status: formData.status,
        entity: {
          basicNumber: formData.basicNumber.trim(),
          cisNumber: formData.cisNumber.trim() || null,
          taxId: formData.taxId.trim(),
          address1: formData.address1.trim(),
          address2: formData.address2.trim() || null,
          addressCountry: formData.addressCountry,
          placeOfIncorporation: formData.placeOfIncorporation,
          // Include contact fields directly in entity object
          businessActivity: formData.businessActivity.trim() || null,
          contactPerson: formData.contactPerson.trim() || null,
          contactEmail: formData.contactEmail.trim() || null,
          contactPhone: formData.contactPhone.trim() || null
        }
      };
      
      console.log('Submitting case data:', JSON.stringify(caseData, null, 2));
      await onCreate(caseData);
      // Modal will be closed by parent component after successful creation
    } catch (error) {
      console.error('Error creating case:', error);
      setIsSubmitting(false);
      // You might want to show an error message here
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="entityName"
                  value={formData.entityName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.entityName ? 'border-red-500' : ''
                  }`}
                  placeholder="ABC Company Pte Ltd"
                  disabled={isSubmitting}
                />
                {errors.entityName && (
                  <p className="mt-1 text-sm text-red-600">{errors.entityName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Entity Type <span className="text-red-500">*</span>
                </label>
                {isLoadingEntityTypes ? (
                  <div className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                    <div className="animate-pulse">Loading entity types...</div>
                  </div>
                ) : (
                  <select
                    name="entityType"
                    value={formData.entityType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={entityTypes.length === 0 || isSubmitting}
                  >
                    {entityTypes.length === 0 ? (
                      <option value="">No entity types available</option>
                    ) : (
                      entityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Entity types are configured in Document Requirements
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Basic Number (BN) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="basicNumber"
                    value={formData.basicNumber}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pl-9 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.basicNumber ? 'border-red-500' : ''
                    }`}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isSubmitting}
                  />
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                {errors.basicNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.basicNumber}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Company registration number (6 digits)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  CIS Number
                </label>
                <input
                  type="text"
                  name="cisNumber"
                  value={formData.cisNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-gray-500">Customer Information System number if available</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Tax ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.taxId ? 'border-red-500' : ''
                  }`}
                  placeholder="GST registration number"
                  disabled={isSubmitting}
                />
                {errors.taxId && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Business Activity
                </label>
                <textarea
                  name="businessActivity"
                  value={formData.businessActivity}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description of business activities"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address1"
                value={formData.address1}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address1 ? 'border-red-500' : ''
                }`}
                placeholder="123 Main Street"
                disabled={isSubmitting}
              />
              {errors.address1 && (
                <p className="mt-1 text-sm text-red-600">{errors.address1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Address Line 2
              </label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unit #01-23 (Optional)"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  name="addressCountry"
                  value={formData.addressCountry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Place of Incorporation <span className="text-red-500">*</span>
                </label>
                <select
                  name="placeOfIncorporation"
                  value={formData.placeOfIncorporation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-700 dark:text-slate-300 mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 lg:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="md:col-span-3 lg:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contactEmail ? 'border-red-500' : ''
                    }`}
                    placeholder="john@company.com"
                    disabled={isSubmitting}
                  />
                  {errors.contactEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>
                  )}
                </div>

                <div className="md:col-span-3 lg:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+65 9123 4567"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Initial Risk Level
              </label>
              <select
                name="riskLevel"
                value={formData.riskLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This can be adjusted later based on due diligence findings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                Initial Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="Prospect">Prospect</option>
                <option value="KYC Review">KYC Review</option>
              </select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Risk Assessment Guidelines:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600 dark:text-blue-400">
                    <li>High Risk: PEPs, high-risk jurisdictions, complex structures</li>
                    <li>Medium Risk: Foreign entities, certain business activities</li>
                    <li>Low Risk: Local entities with transparent structures</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Create New Onboarding Case
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <nav className="flex min-w-full">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FileText size={14} className="sm:w-4 sm:h-4" />
                <span>Basic Info</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'address'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <MapPin size={14} className="sm:w-4 sm:h-4" />
                <span>Address</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'risk'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertCircle size={14} className="sm:w-4 sm:h-4" />
                <span>Risk</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
              <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoadingEntityTypes}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Building2 size={14} className="sm:w-4 sm:h-4" />
                    <span>Create Case</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}