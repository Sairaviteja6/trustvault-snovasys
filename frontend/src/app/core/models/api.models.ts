export type UserRole = 'Admin' | 'Owner' | 'Viewer';

export enum PermissionType {
  Read = 1,
  Download = 2,
  Edit = 3,
  Delete = 4
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  isMasterAdmin?: boolean;
  mustChangePassword?: boolean;
  organization?: string;
  createdAt: string;
}

export interface SetPasswordRequest {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  department?: string;
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

export interface DocumentSnapshotDto {
  id: string;
  versionNumber: number;
  fileSizeBytes: number;
  editedByUserEmail: string;
  editedByRole: string;
  changeSummary: string;
  createdAt: string;
}

export interface DocumentContentResponse {
  id: string;
  title: string;
  contentType: string;
  textContent: string;
  isBinary: boolean;
  base64Data?: string | null;
  currentVersion: number;
  permittedActions: string[];
}

export interface EditDocumentContentRequest {
  content: string;
  changeSummary?: string;
}
