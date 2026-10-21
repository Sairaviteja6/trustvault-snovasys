export type UserRole = 'Admin' | 'Owner' | 'Viewer';

export enum PermissionType {
  Read = 0,
  Download = 1,
  Edit = 2,
  Delete = 3
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiration: string;
  user: UserDto;
}

export interface DocumentResponse {
  id: string;
  title: string;
  description: string;
  category: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  permittedActions: string[];
}

export interface PermissionResponse {
  grantId: string;
  userId: string;
  username: string;
  email: string;
  permissionType: string;
  grantedAtUtc: string;
}

export interface GrantPermissionRequest {
  userId: string;
  permissions: PermissionType[];
}

export interface GrantByTagRequest {
  tagName: string;
  permissions: PermissionType[];
}

export interface AuditLogDto {
  id: number;
  timestamp: string;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  status: string;
  documentId?: string | null;
  documentTitle?: string | null;
  ipAddress: string;
  userAgent: string;
  details?: string | null;
  previousHash: string;
  currentHash: string;
}

export interface AuditVerificationResult {
  isChainIntact: boolean;
  totalAuditedRecords: number;
  compromisedLogId?: number | null;
  verificationTimestamp: string;
  status: string;
}

export interface AdminMetricsResponse {
  totalActiveOwners: number;
  totalActiveViewers: number;
  totalDocuments: number;
  totalAuditLogs: number;
  totalRefusedAttempts: number;
  recentRefusedAttempts: AuditLogDto[];
}

export interface OwnerMetricsResponse {
  totalOwnedDocs: number;
  activeGrantsCount: number;
  totalViewers: number;
  totalTags: number;
}

export interface UserTagDto {
  id: string;
  userId: string;
  username: string;
  email: string;
  tagName: string;
}

export interface CreateOwnerRequest {
  username: string;
  email: string;
  password: string;
  department?: string;
}

export interface CreateViewerRequest {
  username: string;
  email: string;
  password: string;
  department?: string;
  initialTags?: string[];
}
