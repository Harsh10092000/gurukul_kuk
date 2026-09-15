import { Application, ApplicationStatus } from './types';

export interface CanonicalMetrics {
  total: number;             // All dossiers in database (active + rejected)
  active: number;            // All active candidates in portal (submitted + drafts, excl. rejected)
  submitted: number;         // Completed submissions (under_review + submitted + approved + correction_needed)
  draft: number;             // Incomplete drafts in progress
  underReview: number;       // Awaiting scrutiny / submitted
  approved: number;          // Approved & verified
  correctionNeeded: number;  // Flagged for re-upload
  rejected: number;          // Rejected candidate archives
  totalFeesCollected: number;
}

/**
 * Single source of truth calculation for administrative metrics.
 * Reconciles Total, Active, Submitted, Drafts, Approved, Under Review, and Rejected.
 * 
 * Mathematical Invariants:
 * 1. total = active + rejected
 * 2. active = submitted + draft
 * 3. submitted = approved + underReview + correctionNeeded
 * 4. total = approved + underReview + correctionNeeded + draft + rejected
 */
export function computeApplicationMetrics(applications: Application[]): CanonicalMetrics {
  const total = applications.length;

  const draft = applications.filter((a) => a.status === 'draft').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  // Non-rejected candidates actively in portal
  const active = applications.filter((a) => a.status !== 'rejected').length;

  // Candidate applications with finalized submission and fee payment
  const submitted = applications.filter(
    (a) => a.status !== 'draft' && a.status !== 'rejected'
  ).length;

  const underReview = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'under_review'
  ).length;

  const approved = applications.filter(
    (a) => a.status === 'approved' || a.status === 'admit_card_ready' || a.status === 'admitted'
  ).length;

  const correctionNeeded = applications.filter(
    (a) => a.status === 'correction_needed'
  ).length;

  const totalFeesCollected = applications
    .filter((a) => a.paymentStatus === 'completed')
    .reduce((sum, a) => sum + (a.amountPaid || 1200), 0);

  return {
    total,
    active,
    submitted,
    draft,
    underReview,
    approved,
    correctionNeeded,
    rejected,
    totalFeesCollected,
  };
}

/**
 * Controlled whitelist of valid application statuses.
 */
export const VALID_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'correction_needed',
  'approved',
  'rejected',
  'admit_card_ready',
  'admitted',
] as const;

/**
 * Validate whether a provided status string is valid.
 */
export function isValidApplicationStatus(status: any): status is ApplicationStatus {
  return typeof status === 'string' && VALID_APPLICATION_STATUSES.includes(status as ApplicationStatus);
}

/**
 * Server-side status transition rules to prevent invalid or malicious status alterations.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'approved', 'rejected', 'correction_needed'],
  under_review: ['approved', 'rejected', 'correction_needed'],
  correction_needed: ['under_review', 'submitted', 'rejected'],
  approved: ['rejected', 'admit_card_ready'],
  admit_card_ready: ['admitted', 'rejected'],
  admitted: ['rejected'],
  rejected: ['draft'], // Can only restart as draft via authorized refill process
};

/**
 * Validate a proposed status transition.
 */
export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus,
  userRole: string
): { valid: boolean; reason?: string } {
  if (userRole !== 'admin') {
    return { valid: false, reason: 'Only authorized administrators can modify application status.' };
  }

  if (!isValidApplicationStatus(targetStatus)) {
    return { valid: false, reason: `Status '${targetStatus}' is not a valid portal application status.` };
  }

  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      reason: `Illegal status transition: Cannot change status from '${currentStatus}' directly to '${targetStatus}'.`,
    };
  }

  return { valid: true };
}
