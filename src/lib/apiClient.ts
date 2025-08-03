// =================================================================================
// FILE: src/lib/apiClient.ts
// =================================================================================
import type { 
  EnumConfig, 
  CaseStatus, 
  RiskLevel, 
  DocStatus,
  User, 
  Party, 
  Case, 
  CaseCreationData, 
  ActivityLog, 
  CallReport, 
  DocumentRequirements,
  Document,
  ScannerProfile,
  CaseDocumentLink,
  DocumentVersion,
  Role
} from '@/types/entities';

// =================================================================================
// BACKEND DATA TYPES - These match the Java DTOs
// =================================================================================

// Backend user structure (different from frontend User type)
interface BackendUser {
  userId: string;
  username: string;
  password: string;
  enabled: boolean;
  name: string;
  email: string;
  role: string;
  department?: string;
  roles?: string[];
}

// Backend document structure
interface DocumentDto {
  id: number;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  sizeInBytes: number;
  expiryDate?: string;
  createdBy?: string;
  createdDate?: string;
  name: string;
  status: string;
  version: number;
  ownerType: string;
  ownerId: string;
  uploadedBy?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  rejectionReason?: string;
  comments?: string;
  isCurrentForCase?: boolean; 
}

// Backend related party structure
interface RelatedPartyDto {
  id: number;
  partyId: string;
  name: string;
  relationshipType: string;
  ownershipPercentage?: number;
}

// Scanner trigger response
interface ScanTriggerResponse {
  documentId: string;
  status: string;
  message?: string;
}

// =================================================================================
// CONFIGURATION
// =================================================================================

// Get API base URL from environment variables with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

// Cache for document requirements to reduce API calls
let cachedDocumentRequirements: DocumentRequirements | null = null;

// =================================================================================
// AUTHENTICATION HELPERS
// =================================================================================

/**
 * Get authentication headers for API requests
 * Uses Basic Auth with credentials from environment variables
 */
const getAuthHeaders = () => {
  // Get credentials from environment variables
  const username = process.env.NEXT_PUBLIC_API_USERNAME || 'admin';
  const password = process.env.NEXT_PUBLIC_API_PASSWORD || 'password123';
  
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Generic response handler for API calls
 * Throws an error if response is not ok, otherwise returns parsed JSON
 */
const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(`API Error: ${response.status} - ${errorText}`);
    throw new Error(`API call failed with status: ${response.status}`);
  }
  return response.json();
};

// =================================================================================
// CASE MANAGEMENT FUNCTIONS
// =================================================================================

/**
 * Get all cases
 */
export const getCases = async (): Promise<Case[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, { 
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return await handleApiResponse<Case[]>(response);
  } catch (error) {
    console.error("Failed to fetch cases:", error);
    throw error;
  }
};

/**
 * Get detailed information about a specific case
 * This fetches the case, related parties, documents, and other supporting data
 */
export const getCaseDetails = async (caseId: string) => {
  try {
    const headers = getAuthHeaders();
    
    // Fetch case, parties, and documents in parallel for better performance
    const [caseResponse, partiesResponse, documentsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/cases/${caseId}`, { headers, credentials: 'include' }),
      fetch(`${API_BASE_URL}/parties/case/${caseId}`, { headers, credentials: 'include' }),
      fetch(`${API_BASE_URL}/documents/case/${caseId}`, { headers, credentials: 'include' }),
    ]);

    if (!caseResponse.ok) {
      return null;
    }

    const caseData = await handleApiResponse<Case>(caseResponse);
    const parties = partiesResponse.ok ? await handleApiResponse<Party[]>(partiesResponse) : [];
    const documentsDto = documentsResponse.ok ? await handleApiResponse<DocumentDto[]>(documentsResponse) : [];
    
    console.log('Server Documents fetched from API:', documentsDto);
    
    // Transform backend document structure to frontend structure
    const documentsMap = new Map<string, Document>();
    const documentLinks: CaseDocumentLink[] = [];
    
    documentsDto.forEach(dto => {
      // Sanitize document type to create URL-safe document ID
      const sanitizedDocType = dto.documentType
        .replace(/\//g, '_')     // Replace forward slashes
        .replace(/\s+/g, '-')    // Replace spaces
        .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special characters
      
      const documentId = `DOC-${dto.ownerId}-${sanitizedDocType}`;
      
      // Get or create the document
      let document = documentsMap.get(documentId);
      if (!document) {
        document = {
          documentId,
          ownerId: dto.ownerId,
          name: dto.documentType,
          versions: []
        };
        documentsMap.set(documentId, document);
      }
      
      // Add version to document
      const version: DocumentVersion = {
        id: dto.id.toString(),
        version: dto.version,
        status: dto.status as DocStatus,
        uploadedDate: dto.createdDate || new Date().toISOString(),
        fileRef: `/api/documents/download/${dto.id}`,
        mimeType: dto.mimeType,
        fileSize: dto.sizeInBytes,
        expiryDate: dto.expiryDate,
        uploadedBy: dto.uploadedBy,
        verifiedBy: dto.verifiedBy,
        verifiedDate: dto.verifiedDate,
        rejectionReason: dto.rejectionReason,
        comments: dto.comments,
        isCurrentForCase: dto.isCurrentForCase || false
      };
      
      document.versions.push(version);
      
      // Create document link if needed
      if (dto.isCurrentForCase || dto.status !== 'Missing') {
        const link: CaseDocumentLink = {
          linkId: dto.ownerType === 'CASE' 
            ? `LNK-${caseId}-${dto.id}`
            : `LNK-${caseId}-PARTY-${dto.id}`,
          caseId: caseId,
          documentId: documentId,
          versionId: version.id,
          status: dto.status as DocStatus,
          comments: dto.comments
        };
        documentLinks.push(link);
      }
    });
    
    // Sort versions within each document
    documentsMap.forEach(doc => {
      doc.versions.sort((a, b) => a.version - b.version);
    });
    
    const documents = Array.from(documentsMap.values());
    
    // Fetch additional data
    const scannerProfiles = await getScannerProfiles();
    const allUsers = await getUsers();
    const allParties = await getParties();
    
    return { 
      caseData, 
      parties, 
      documents, 
      documentLinks,
      scannerProfiles, 
      allUsers,
      allParties 
    };
  } catch (error) {
    console.error(`Failed to fetch case details for ${caseId}:`, error);
    throw error;
  }
};

/**
 * Create a new case
 */
export const createCase = async (newCaseData: CaseCreationData): Promise<Case> => {
  try {
    console.log('=== CREATE CASE REQUEST ===');
    console.log('Sending to backend:', JSON.stringify(newCaseData, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(newCaseData),
    });

    const result = await handleApiResponse<Case>(response);
    
    console.log('=== CREATE CASE RESPONSE ===');
    console.log('Received from backend:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error("Failed to create case:", error);
    throw error;
  }
};

/**
 * Assign a case to a user
 */
export const assignCase = async (caseId: string, userId: string): Promise<Case> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ userId }),
    });
    return await handleApiResponse<Case>(response);
  } catch (error) {
    console.error("Failed to assign case:", error);
    throw error;
  }
};

/**
 * Update case status and risk level
 */
export const updateCaseStatus = async (
  caseId: string, 
  updates: { status: CaseStatus, riskLevel: RiskLevel }
): Promise<Case> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    
    const updatedCase = await handleApiResponse<Case>(response);
    
    // Map status to workflow stage (temporary until backend supports this)
    updatedCase.workflowStage = getWorkflowStageFromStatus(updates.status);
    
    return updatedCase;
  } catch (error) {
    console.error("Failed to update case status:", error);
    throw error;
  }
};

/**
 * Update entity data for a case
 */
export const updateEntityData = async (caseId: string, entityData: Case['entity']): Promise<Case> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/entity`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(entityData),
    });
    return await handleApiResponse<Case>(response);
  } catch (error) {
    console.error("Failed to update entity data:", error);
    throw error;
  }
};

// =================================================================================
// ACTIVITY & CALL REPORT FUNCTIONS
// =================================================================================

/**
 * Add an activity log entry to a case
 */
export const addActivityLog = async (
  caseId: string, 
  activityData: Omit<ActivityLog, 'activityId' | 'timestamp'>
): Promise<Case> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/activities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        type: activityData.type,
        details: activityData.details
      }),
    });
    
    await handleApiResponse<ActivityLog>(response);
    
    // Fetch updated case data
    const details = await getCaseDetails(caseId);
    if (!details?.caseData) throw new Error('Case not found');
    return details.caseData;
  } catch (error) {
    console.error("Failed to add activity log:", error);
    throw error;
  }
};

/**
 * Add a call report to a case
 */
export const addCallReport = async (
  caseId: string, 
  reportData: Omit<CallReport, 'reportId'>
): Promise<Case> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(reportData),
    });
    
    await handleApiResponse<CallReport>(response);
    
    // Fetch updated case data
    const details = await getCaseDetails(caseId);
    if (!details?.caseData) throw new Error('Case not found');
    return details.caseData;
  } catch (error) {
    console.error("Failed to add call report:", error);
    throw error;
  }
};

/**
 * Update an existing call report
 */
export const updateCallReport = async (
  caseId: string, 
  reportId: string, 
  reportData: Omit<CallReport, 'reportId'>
): Promise<Case> => {
  try {
    // Extract numeric ID from formatted reportId (e.g., "CR-001" -> "1")
    const numericId = reportId.replace('CR-', '').replace(/^0+/, '');
    
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/reports/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(reportData),
    });
    
    await handleApiResponse<CallReport>(response);
    
    // Fetch updated case details
    const details = await getCaseDetails(caseId);
    if (!details?.caseData) throw new Error('Case not found');
    return details.caseData;
  } catch (error) {
    console.error("Failed to update call report:", error);
    throw error;
  }
};

/**
 * Delete a call report
 */
export const deleteCallReport = async (
  caseId: string, 
  reportId: string, 
  reason?: string
): Promise<void> => {
  try {
    // Extract numeric ID from formatted reportId
    const numericId = reportId.replace('CR-', '').replace(/^0+/, '');
    
    const params = new URLSearchParams();
    if (reason) {
      params.append('reason', reason);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/cases/${caseId}/reports/${numericId}${params.toString() ? '?' + params.toString() : ''}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to delete call report: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("Failed to delete call report:", error);
    throw error;
  }
};

// =================================================================================
// USER MANAGEMENT FUNCTIONS
// =================================================================================

/**
 * Get all users
 */
export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, { 
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const users = await handleApiResponse<BackendUser[]>(response);
    
    // Map backend user structure to frontend
    return users.map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.roles?.[0] || user.role,
      department: user.department || '',
      isActive: user.enabled !== undefined ? user.enabled : true
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (userData: Omit<User, 'userId' | 'isActive'>): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        username: userData.email.split('@')[0], // Generate username from email
        password: 'password123', // Default password - should be changed by user
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        enabled: true,
        roles: [userData.role] // Backend expects role array
      }),
    });
    
    const createdUser = await handleApiResponse<BackendUser>(response);
    
    // Map backend response to frontend User type
    return {
      userId: createdUser.userId,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.roles?.[0] || createdUser.role,
      department: createdUser.department || '',
      isActive: createdUser.enabled !== undefined ? createdUser.enabled : true
    };
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
};

/**
 * Update user information
 */
export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department
      }),
    });
    
    const updatedUser = await handleApiResponse<BackendUser>(response);
    
    // Map backend response to frontend User type
    return {
      userId: updatedUser.userId,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.roles?.[0] || updatedUser.role,
      department: updatedUser.department || '',
      isActive: updatedUser.enabled !== undefined ? updatedUser.enabled : true
    };
  } catch (error) {
    console.error("Failed to update user:", error);
    throw error;
  }
};

/**
 * Update user active/inactive status
 */
export const updateUserStatus = async (userId: string, isEnabled: boolean): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ isEnabled }),
    });
    const updatedUser = await handleApiResponse<BackendUser>(response);
    
    // Map backend 'enabled' to frontend 'isActive'
    return {
      userId: updatedUser.userId,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.roles?.[0] || updatedUser.role,
      department: updatedUser.department || '',
      isActive: updatedUser.enabled !== undefined ? updatedUser.enabled : true
    };
  } catch (error) {
    console.error("Failed to update user status:", error);
    throw error;
  }
};

// =================================================================================
// ROLE MANAGEMENT FUNCTIONS
// =================================================================================

/**
 * Get all roles
 */
export const getRoles = async (): Promise<Record<string, Role>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return await handleApiResponse<Record<string, Role>>(response);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    throw error;
  }
};

/**
 * Create a new role
 */
export const createRole = async (roleData: { 
  name: string; 
  label: string; 
  permissions: Record<string, boolean> 
}): Promise<Role> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(roleData),
    });
    return await handleApiResponse<Role>(response);
  } catch (error) {
    console.error("Failed to create role:", error);
    throw error;
  }
};

/**
 * Update a role's display label
 */
export const updateRoleLabel = async (roleId: number, updates: { label: string }): Promise<Role> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    return await handleApiResponse<Role>(response);
  } catch (error) {
    console.error("Failed to update role label:", error);
    throw error;
  }
};

/**
 * Delete a role
 */
export const deleteRole = async (roleId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to delete role: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("Failed to delete role:", error);
    throw error;
  }
};

/**
 * Update role permissions
 */
export const updateRolePermissions = async (
  roleName: string, 
  permissions: Record<string, boolean>
): Promise<Role> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles/${roleName}/permissions`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ permissions }),
    });
    return await handleApiResponse<Role>(response);
  } catch (error) {
    console.error("Failed to update role permissions:", error);
    throw error;
  }
};

// =================================================================================
// PARTY MANAGEMENT FUNCTIONS
// =================================================================================

/**
 * Get all parties (individuals)
 */
export const getParties = async (): Promise<Party[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parties`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return await handleApiResponse<Party[]>(response);
  } catch (error) {
    console.error("Failed to fetch parties:", error);
    throw error;
  }
};

/**
 * Get party details including documents
 */
export const getPartyDetails = async (partyId: string) => {
  try {
    const headers = getAuthHeaders();
    const [partyResponse, documentsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/parties/${partyId}`, { headers, credentials: 'include' }),
      fetch(`${API_BASE_URL}/parties/${partyId}/documents`, { headers, credentials: 'include' }),
    ]);

    if (!partyResponse.ok) {
      return null;
    }

    const party = await handleApiResponse<Party>(partyResponse);
    const documents = documentsResponse.ok ? await handleApiResponse<Document[]>(documentsResponse) : [];
    
    return { party, documents };
  } catch (error) {
    console.error(`Failed to fetch party details for ${partyId}:`, error);
    throw error;
  }
};

/**
 * Create a new party
 */
export const createParty = async (partyData: Omit<Party, 'partyId'>): Promise<Party> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parties`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(partyData),
    });
    return await handleApiResponse<Party>(response);
  } catch (error) {
    console.error("Failed to create party:", error);
    throw error;
  }
};

/**
 * Update party information
 */
export const updateParty = async (partyId: string, partyData: Partial<Party>): Promise<Party> => {
  try {
    const response = await fetch(`${API_BASE_URL}/parties/${partyId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(partyData),
    });
    return await handleApiResponse<Party>(response);
  } catch (error) {
    console.error("Failed to update party:", error);
    throw error;
  }
};

/**
 * Add a related party to a case
 */
export const addRelatedParty = async (
  caseId: string, 
  partyData: { 
    partyId: string; 
    name: string;
    relationshipType: string; 
    ownershipPercentage?: number 
  }
): Promise<RelatedPartyDto> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/parties`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(partyData),
    });
    return await handleApiResponse<RelatedPartyDto>(response);
  } catch (error) {
    console.error("Failed to add related party:", error);
    throw error;
  }
};

/**
 * Remove a related party from a case
 */
export const removeRelatedParty = async (
  caseId: string, 
  partyId: string,
  relationshipType: string
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/cases/${caseId}/parties/${partyId}?relationshipType=${encodeURIComponent(relationshipType)}`, 
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`API Error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to remove party: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to remove related party:", error);
    throw error;
  }
};

// =================================================================================
// DOCUMENT MANAGEMENT FUNCTIONS
// =================================================================================

/**
 * Upload a document for a case or party
 */
export const uploadDocument = async (
  ownerId: string, 
  ownerType: 'CASE' | 'PARTY', 
  documentType: string, 
  file: File,
  metadata?: { expiryDate?: string; comments?: string }
): Promise<DocumentDto> => {
  try {
    console.log('Upload parameters:', {
      ownerId,
      ownerType,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      metadata
    });

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    
    // Add optional metadata
    if (metadata?.expiryDate) {
      formData.append('expiryDate', metadata.expiryDate);
    }
    if (metadata?.comments) {
      formData.append('comments', metadata.comments);
    }

    const endpoint = ownerType === 'CASE' 
      ? `${API_BASE_URL}/documents/upload/case/${ownerId}`
      : `${API_BASE_URL}/documents/upload/party/${ownerId}`;

    // Note: Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeaders().Authorization,
      },
      credentials: 'include',
      body: formData,
    });

    const result = await handleApiResponse<DocumentDto>(response);
    console.log('Upload response:', result);
    return result;
  } catch (error) {
    console.error("Failed to upload document:", error);
    throw error;
  }
};

/**
 * Update document status (verify, reject, etc.)
 */
export const updateDocumentStatus = async (
  documentId: number, 
  status: string, 
  rejectionReason?: string
): Promise<DocumentDto> => {
  try {
    const params = new URLSearchParams({ status });
    if (rejectionReason) {
      params.append('rejectionReason', rejectionReason);
    }

    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status?${params}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    return await handleApiResponse<DocumentDto>(response);
  } catch (error) {
    console.error("Failed to update document status:", error);
    throw error;
  }
};

/**
 * Download a document
 */
export const downloadDocument = async (documentId: number): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/download/${documentId}`, {
      headers: {
        'Authorization': getAuthHeaders().Authorization,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("Failed to download document:", error);
    throw error;
  }
};

/**
 * Update which document version is linked to a case
 */
export const updateDocumentLink = async (
  caseId: string, 
  documentId: string, 
  versionId: string
): Promise<CaseDocumentLink> => {
  try {
    // URL encode documentId to handle special characters
    const encodedDocumentId = encodeURIComponent(documentId);
    const url = `${API_BASE_URL}/cases/${caseId}/documents/${encodedDocumentId}/link`;
    
    console.log('🔗 updateDocumentLink details:', {
      originalDocumentId: documentId,
      encodedDocumentId,
      fullUrl: url,
      caseId,
      versionId,
    });
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ versionId }),
    });
    
    const result = await handleApiResponse<CaseDocumentLink>(response);
    console.log('✅ updateDocumentLink successful:', result);
    return result;
  } catch (error) {
    console.error("❌ Failed to update document link:", error);
    throw error;
  }
};

// =================================================================================
// SCANNER INTEGRATION
// =================================================================================

/**
 * Trigger a document scan
 */
export const triggerScan = async (scanRequest: {
  profileName: string;
  ownerType: string;
  ownerId: string;
  documentType: string;
  format?: string;
}): Promise<ScanTriggerResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scans/trigger`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(scanRequest),
    });

    return await handleApiResponse<ScanTriggerResponse>(response);
  } catch (error) {
    console.error("Failed to trigger scan:", error);
    throw error;
  }
};

/**
 * Get all scanner profiles
 */
export const getScannerProfiles = async (): Promise<ScannerProfile[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/scanner-profiles`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return await handleApiResponse<ScannerProfile[]>(response);
  } catch (error) {
    console.error("Failed to fetch scanner profiles:", error);
    throw error;
  }
};

// =================================================================================
// CONFIGURATION FUNCTIONS
// =================================================================================

/**
 * Get all enums and roles configuration
 */
export const getEnums = async (): Promise<EnumConfig> => {
  try {
    console.log('Fetching enums from:', `${API_BASE_URL}/enums`);
    
    // Enums endpoint is public - no auth needed
    const response = await fetch(`${API_BASE_URL}/enums`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Enums fetch failed:', errorText);
      throw new Error(`Failed to fetch enums: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Enums data received:', data);
    
    return data;
  } catch (error) {
    console.error("Failed to fetch enums - using fallback:", error);
    
    // Fallback to default enums if API fails
    return {
      roles: {
        'ROLE_MANAGER': {
          id:1,
          label: 'General Manager',
          permissions: { 
            'case:read': true, 
            'case:update': true, 
            'case:approve': true, 
            'admin:manage-users': true, 
            'document:upload': true,
            'document:verify': true,
            'document:read': true
          },
        },
        'ROLE_PROCESSOR': {
          id:2,
          label: 'Deposits Manager',
          permissions: { 
            'case:read': true, 
            'case:update': true,
            'document:upload': true,
            'document:verify': true,
            'document:read': true
          },
        },
        'ROLE_VIEWER': {
          id:3,
          label: 'Read-Only User',
          permissions: { 
            'case:read': true, 
            'case:update': false, 
            'case:approve': false, 
            'admin:manage-users': false, 
            'document:upload': false,
            'document:read': true
          },
        },
        'ROLE_COMPLIANCE': {
          id:4,
          label: 'Compliance Officer',
          permissions: { 
            'case:read': true, 
            'case:update': true,
            'case:approve': true,
            'document:upload': true,
            'document:verify': true,
            'document:read': true
          },
        },
        'ROLE_ADMIN': {
          id:5,
          label: 'Administrator',
          permissions: { 
            'case:read': true, 
            'case:update': true, 
            'case:approve': true, 
            'admin:manage-users': true, 
            'admin:manage-templates': true,
            'document:upload': true,
            'document:verify': true,
            'document:read': true
          },
        },
      },
      enums: {
        caseStatus: ['Prospect', 'KYC Review', 'Pending Approval', 'Active', 'Rejected'],
        riskLevel: ['Low', 'Medium', 'High'],
        docStatus: ['Missing', 'Submitted', 'Verified', 'Rejected', 'Expired'],
        entityTypes: ['Non-Listed Company', 'Listed Company', 'Partnership', 'Trust Account'],
      }
    };
  }
};

/**
 * Get document requirements configuration
 */
export const getDocumentRequirements = async (): Promise<DocumentRequirements> => {
  // Return cached version if available
  if (cachedDocumentRequirements) {
    return cachedDocumentRequirements;
  }

  try {
    // This endpoint is public
    const response = await fetch(`${API_BASE_URL}/configurations/document-requirements`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document requirements: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched document requirements:', data);
    
    // Cache the requirements
    cachedDocumentRequirements = data;
    return data;
  } catch (error) {
    console.error('Error fetching document requirements:', error);
    
    // Fallback to empty template if API fails
    return {
      individualTemplates: {},
      entityTemplates: {},
      bankFormTemplates: {
        corporateMandatory: [],
        corporateOptional: [],
        individualStakeholder: []
      },
      riskBasedDocuments: {},
      entityRoleMapping: {}
    };
  }
};

/**
 * Update document requirements configuration
 */
export const updateDocumentRequirements = async (
  requirements: DocumentRequirements
): Promise<DocumentRequirements | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/configurations/document-requirements`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(requirements),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update document requirements: ${response.status}`);
    }
    
    const updated = await response.json();
    
    // Clear the cache so next fetch gets fresh data
    clearDocumentRequirementsCache();
    
    return updated;
  } catch (error) {
    console.error('Error updating document requirements:', error);
    throw error;
  }
};

/**
 * Clear the document requirements cache
 * Call this after admin updates templates
 */
export function clearDocumentRequirementsCache() {
  cachedDocumentRequirements = null;
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

/**
 * Map case status to workflow stage
 * This is a temporary function until the backend supports workflow stages
 */
const getWorkflowStageFromStatus = (status: CaseStatus): string => {
  const statusToStageMap: Record<CaseStatus, string> = {
    'Prospect': 'prospect',
    'KYC Review': 'kyc_review',
    'Pending Approval': 'approval',
    'Active': 'completed',
    'Rejected': 'completed'
  };
  
  return statusToStageMap[status] || 'prospect';
};

