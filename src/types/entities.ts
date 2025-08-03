// =================================================================================
// FILE: src/types/index.ts
// =================================================================================
// This file combines all type definitions for the application, providing a single
// source of truth for both enum types and entity interfaces.

// =================================================================================
// ENUM TYPES - Static string literal unions for type safety
// =================================================================================

export type CaseStatus = 'KYC Review' | 'Pending Approval' | 'Active' | 'Rejected' | 'Prospect';
export type RiskLevel = 'High' | 'Medium' | 'Low';
export type DocStatus = 'Missing' | 'Submitted' | 'Verified' | 'Rejected' | 'Expired';
export type RoleName = 'ROLE_MANAGER' | 'ROLE_PROCESSOR' | 'ROLE_VIEWER' | 'ROLE_COMPLIANCE' | 'ROLE_ADMIN';

// =================================================================================
// CORE ENTITY MODELS - The main business objects
// =================================================================================

export interface Case {
  caseId: string;
  status: CaseStatus;
  riskLevel: RiskLevel;
  createdDate: string;
  slaDeadline: string;
  assignedTo: string | null;
  approvedBy?: string | null;
  workflowStage: string;
  approvalChain: string[];
  entity: {
    customerId: string;
    entityName: string;
    entityType: string;
    basicNumber?: string | null;
    cisNumber?: string | null;
    taxId: string;
    address1: string;
    address2?: string;
    addressCountry: string;
    placeOfIncorporation: string;
    usFatcaClassificationFinal: string;
    businessActivity?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    creditDetails?: CreditDetails;
  };
  relatedPartyLinks: {
    partyId: string;
    relationships: { type: string; ownershipPercentage?: number }[];
  }[];
  callReports: CallReport[];
  activities: ActivityLog[];
}

export interface Party {
  partyId: string;
  name: string;
  firstName: string;
  lastName: string;
  residencyStatus: string;
  idType: string;
  identityNo: string;
  birthDate: string;
  employmentStatus?: string;
  employerName?: string;
  isPEP: boolean;
  pepCountry?: string;
}

export interface Document {
  documentId: string;
  ownerId: string;
  name: string;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  version: number;
  status: DocStatus;
  uploadedDate: string;
  fileRef: string;
  mimeType?: string;
  fileSize?: number;
  expiryDate?: string;
  uploadedBy?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  rejectionReason?: string;
  comments?: string;
  isCurrentForCase?: boolean;
}

// =================================================================================
// USER & ROLE MANAGEMENT
// =================================================================================

export interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
}

// Single Role interface that works for both API responses and UI needs
export interface Role {
  id: number;                           // Database ID (required for admin functions)
  name?: string;                        // Role name like "ROLE_ADMIN" (optional as it might be the key)
  label: string;                        // Display label like "Administrator"
  permissions: Record<string, boolean>; // Permission map
}

// =================================================================================
// SUPPORTING TYPES
// =================================================================================

export interface CaseDocumentLink {
  linkId: string;
  caseId: string;
  documentId: string;
  versionId: string;
  status: DocStatus;
  comments?: string;
}

export interface CreditDetails {
  creditLimit: number;
  creditScore: string;
  assessmentNotes: string;
}

export interface CallReport {
  reportId: string;
  callDate: string;
  summary: string;
  nextSteps: string;
  callType?: 'Inbound' | 'Outbound' | 'Meeting' | 'Email';
  duration?: number;
  attendees?: string[];
  outcome?: 'Positive' | 'Neutral' | 'Negative' | 'Follow-up Required';
  createdBy?: string;
  createdDate?: string;
}

export interface ActivityLog {
  activityId: string;
  type: string;
  timestamp: string;
  performedBy: string;
  details: string;
}

// =================================================================================
// UI & CONFIGURATION TYPES
// =================================================================================

export interface ScannerProfile {
  id: string;
  name: string;
  resolution: string;
  colorMode: string;
  source: string;
}

export interface NewPartyData {
  partyId?: string;
  name?: string;
  residencyStatus?: string;
  relationships: { type: string; ownershipPercentage?: number }[];
}

export interface CaseCreationData {
  entityName: string;
  entityType: string;
  riskLevel: RiskLevel;
  status: CaseStatus;
  entity?: {
    basicNumber?: string | null;
    cisNumber?: string | null;
    taxId: string;
    address1: string;
    address2?: string | null;  // Change to accept null
    addressCountry: string;
    placeOfIncorporation: string;
    businessActivity?: string | null;  // Add these fields and accept null
    contactPerson?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
}

export interface TemplateDoc {
  name: string;
  required?: boolean;
  validityMonths?: number;
  description?: string;
}

export interface DocumentRequirements {
  individualTemplates: Record<string, TemplateDoc[]>;
  entityTemplates: Record<string, TemplateDoc[]>;
  bankFormTemplates: {
    corporateMandatory: string[];
    corporateOptional: string[];
    individualStakeholder: string[];
  };
  riskBasedDocuments: Record<string, TemplateDoc[]>;
  entityRoleMapping: Record<string, string[]>;
}

// =================================================================================
// API CONFIGURATION TYPES
// =================================================================================

/**
 * Configuration object returned by the API containing roles and enum values
 */
export interface EnumConfig {
  roles: Record<string, Role>;  // Changed from Record<RoleName, Role> to be more flexible
  enums: {
    caseStatus: string[];
    riskLevel: string[];
    docStatus: string[];
    entityTypes: string[];
  };
}

// =================================================================================
// ADDITIONAL TYPE UTILITIES (Optional but useful)
// =================================================================================

// Type guards
export const isCaseStatus = (value: string): value is CaseStatus => {
  return ['KYC Review', 'Pending Approval', 'Active', 'Rejected', 'Prospect'].includes(value);
};

export const isRiskLevel = (value: string): value is RiskLevel => {
  return ['High', 'Medium', 'Low'].includes(value);
};

export const isDocStatus = (value: string): value is DocStatus => {
  return ['Missing', 'Submitted', 'Verified', 'Rejected', 'Expired'].includes(value);
};

// Add these to your consolidated types file:

export interface EnumItemConfig {
  label: string;
  color: string;
  darkColor: string;
  icon?: string;
}

export type EnumPayload = Record<string, EnumItemConfig> & {
  _DEFAULT: EnumItemConfig;
};

export interface RoleConfig {
  label: string;
  permissions: Record<string, boolean>;
}