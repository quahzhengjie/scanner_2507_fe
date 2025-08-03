// =================================================================================
// FILE: src/features/case/utils/checklist.ts
// =================================================================================
import type {
  Case,
  Party,
  Document,
  CaseDocumentLink,
  DocumentVersion,
  DocumentRequirements,
  DocStatus
} from '@/types/entities';

import { getDocumentRequirements } from '@/lib/apiClient';

/* ------------------------------------------------------------------ */
/*  TYPES                                                             */
/* ------------------------------------------------------------------ */
export interface ChecklistDocument {
  /* ids & linkage */
  id?: string;                   // version-id when linked | synthetic when missing
  masterDocumentId?: string;     // the master record this version belongs to

  /* template info */
  name: string;
  required?: boolean;
  description?: string;          // human friendly note from template
  validityMonths?: number;       // policy rule (e.g. "must be ≤ 3 mths old")

  /* status & metadata */
  status: DocStatus;
  ownerId: string;
  ownerName: string;
  version?: number;
  uploadedDate?: string;
  expiryDate?: string;
  mimeType?: string;
  rejectionReason?: string;
  comments?: string;             // Add this field for document comments

  /* reuse & history */
  reusableDocument?: { documentId: string; versionId: string } | null;
  allVersions?: DocumentVersion[];
}

export interface ChecklistSection {
  category: string;
  documents: ChecklistDocument[];
}

/* ------------------------------------------------------------------ */
/*  MAIN ENGINE                                                       */
/* ------------------------------------------------------------------ */
export const generateLiveChecklist = async (
  onboardingCase: Case,
  parties: Party[],
  allDocuments: Document[],
  caseDocumentLinks: CaseDocumentLink[],
  isException = false,
): Promise<{
  checklist: ChecklistSection[];
  progress: { percentage: number; missingDocs: ChecklistDocument[] };
}> => {
  if (!onboardingCase) {
    return { checklist: [], progress: { percentage: 0, missingDocs: [] } };
  }

  const { entity, relatedPartyLinks, riskLevel } = onboardingCase;
  
  // Add safety checks
  if (!entity) {
    console.error('Case has no entity data!');
    return { checklist: [], progress: { percentage: 0, missingDocs: [] } };
  }

  // Fetch document requirements from API
  let documentRequirementsTemplate: DocumentRequirements;
  try {
    documentRequirementsTemplate = await getDocumentRequirements();
  } catch (error) {
    console.error('Failed to fetch document requirements:', error);
    // Return empty checklist if we can't fetch requirements
    return { checklist: [], progress: { percentage: 0, missingDocs: [] } };
  }

  const checklist: ChecklistSection[] = [];

  /* ------------ helper: map template-item → live status ------------ */
  const findContext = (
    templateDoc: {
      name: string;
      required?: boolean;
      description?: string;
      validityMonths?: number;
    },
    ownerId: string,
    ownerName: string,
    isEntityDoc: boolean, // Add flag to identify entity documents
  ): ChecklistDocument => {
    const { name } = templateDoc;

    // For entity documents, we need to check documents owned by the case
    const effectiveOwnerId = isEntityDoc ? onboardingCase.caseId : ownerId;

    /* ① Find the document */
    const matchingDoc = allDocuments?.find((d) => 
      d.ownerId === effectiveOwnerId && d.name === name
    );

    if (matchingDoc) {
      // ✅ Find the current version based on isCurrentForCase
      const currentVersion = matchingDoc.versions?.find(v => v.isCurrentForCase === true);
      
      // If no version is marked as current, fall back to the latest version
      const versionToUse = currentVersion || matchingDoc.versions?.[matchingDoc.versions.length - 1];

      if (versionToUse) {
        // Check if this version is linked to the case
        const link = caseDocumentLinks?.find(
          (l) => l.documentId === matchingDoc.documentId && l.versionId === versionToUse.id
        );

        if (link) {
          return {
            ...templateDoc,
            id: versionToUse.id,
            name: templateDoc.name, // Keep the template name
            status: link.status,
            ownerId: isEntityDoc ? entity.customerId : ownerId, // Use customerId for display
            ownerName,
            masterDocumentId: versionToUse.id, // This should be the version ID for history modal
            version: versionToUse.version,
            uploadedDate: versionToUse.uploadedDate,
            expiryDate: versionToUse.expiryDate,
            mimeType: versionToUse.mimeType,
            rejectionReason: versionToUse.rejectionReason,
            comments: versionToUse.comments, // Add comments from version
            allVersions: matchingDoc.versions,
          };
        }
      }

      // If not linked but has verified version, show as reusable
      const verifiedVersion = matchingDoc.versions?.find(v => 
        v.status === 'Verified' && v.isCurrentForCase === true
      ) || matchingDoc.versions?.find(v => v.status === 'Verified');

      if (verifiedVersion) {
        return {
          ...templateDoc,
          id: verifiedVersion.id,
          name: templateDoc.name, // Keep the template name
          status: 'Missing',
          ownerId: isEntityDoc ? entity.customerId : ownerId, // Use customerId for display
          ownerName,
          reusableDocument: { documentId: matchingDoc.documentId, versionId: verifiedVersion.id },
          masterDocumentId: verifiedVersion.id, // This should be the version ID
          comments: verifiedVersion.comments, // Add comments from version
          allVersions: matchingDoc.versions,
        };
      }
    }

    /* ③ Nothing yet */
    return {
      ...templateDoc,
      id: `${ownerId}-${name}`,
      name: templateDoc.name, // Keep the template name
      status: 'Missing',
      ownerId: isEntityDoc ? entity.customerId : ownerId, // Use customerId for display
      ownerName,
    };
  };

  /* ================================================================= */
  /* 1. ENTITY-LEVEL DOCS + FORMS                                      */
  /* ================================================================= */
  const entityTemplate = documentRequirementsTemplate.entityTemplates[entity.entityType] ?? [];

  // Start with entity-specific documents
  const entityDocs = [...entityTemplate];

  // Add mandatory bank forms
  if (documentRequirementsTemplate.bankFormTemplates?.corporateMandatory) {
    entityDocs.push(
      ...documentRequirementsTemplate.bankFormTemplates.corporateMandatory.map(
        (n) => ({ name: n, required: true }),
      )
    );
  }

  // Add optional bank forms ONLY if this is an exception case
  if (isException && documentRequirementsTemplate.bankFormTemplates?.corporateOptional) {
    entityDocs.push(
      ...documentRequirementsTemplate.bankFormTemplates.corporateOptional.map((n) => ({
        name: n,
        required: true, // When it's an exception case, these become required
      }))
    );
  }

  // Add risk-based documents
  if (riskLevel === 'High' && documentRequirementsTemplate.riskBasedDocuments?.High) {
    entityDocs.push(...documentRequirementsTemplate.riskBasedDocuments.High);
  }

  checklist.push({
    category: 'Entity Documents & Forms',
    documents: entityDocs.map((t) =>
      findContext(t, onboardingCase.caseId, entity.entityName, true), // Pass true for entity docs, use caseId
    ),
  });

  /* ================================================================= */
  /* 2. INDIVIDUAL STAKEHOLDERS                                        */
  /* ================================================================= */
  (relatedPartyLinks ?? []).forEach((link) => {
    const party = parties?.find?.((p) => p.partyId === link.partyId);
    
    if (!party) {
      console.warn(`Party not found for ID: ${link.partyId}`);
      return;
    }

    // Check if individual stakeholder forms are needed
    const stakeholderEntities = [
      'Individual Account',
      'Joint Account',
      'Joint Account (Non-resident)',
    ];
    const needsStakeholderForms = stakeholderEntities.includes(entity.entityType);

    // Start with individual documents based on residency status
    const indDocs = [
      ...(documentRequirementsTemplate.individualTemplates[party.residencyStatus] ?? [])
    ];

    // Add individual stakeholder forms if needed
    if (needsStakeholderForms && documentRequirementsTemplate.bankFormTemplates?.individualStakeholder) {
      indDocs.push(
        ...documentRequirementsTemplate.bankFormTemplates.individualStakeholder.map((n) => ({
          name: n,
          required: true,
        }))
      );
    }

    checklist.push({
      category: `Documents for ${party.name}`,
      documents: indDocs.map((t) => findContext(t, party.partyId, party.name, false)), // Pass false for party docs
    });
  });

  /* ================================================================= */
  /* 3. PROGRESS %                                                     */
  /* ================================================================= */
  const progress = calculateDocumentProgress(checklist);
  
  return { checklist, progress };
};

/* ------------------------------------------------------------------ */
export const calculateDocumentProgress = (sections: ChecklistSection[]) => {
  const mustHave = sections.flatMap((s) => s.documents.filter((d) => d.required));
  if (!mustHave.length) return { percentage: 100, missingDocs: [] };

  const done = mustHave.filter((d) => d.status === 'Verified' || d.status === 'Submitted');
  const missing = mustHave.filter((d) => d.status === 'Missing' || d.status === 'Rejected');

  return {
    percentage: Math.round((done.length / mustHave.length) * 100),
    missingDocs: missing,
  };
};