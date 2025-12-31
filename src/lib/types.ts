/**
 * Shared types and constants used across client and server.
 */

// Output format options
export const formatValues = ['svg', 'ascii'] as const;
export type Format = (typeof formatValues)[number];

// Generation status
export const statusValues = ['pending', 'generating', 'completed', 'failed'] as const;
export type Status = (typeof statusValues)[number];

// Moderation approval status
export const approvalValues = ['pending', 'approved', 'rejected'] as const;
export type Approval = (typeof approvalValues)[number];

// Access levels: private (owner only), shared (link access), gallery (public gallery)
export const accessValues = ['private', 'shared', 'gallery'] as const;
export type Access = (typeof accessValues)[number];
