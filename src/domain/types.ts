export type TenantStatus = 'active' | 'suspended' | 'archived';
export type MembershipRole = 'tenant_owner' | 'tenant_admin' | 'dentist' | 'receptionist' | 'assistant';
export type AppointmentStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_service' | 'completed' | 'cancelled' | 'no_show';
export type ClinicalPhotoStatus = 'unverified' | 'verified' | 'rejected';
export type RecallStatus = 'planned' | 'due' | 'contacted' | 'scheduled' | 'dismissed';
export type IntakeStatus = 'pending_review' | 'approved' | 'rejected';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'demo';
export type PlanId = 'essential' | 'pro' | 'premium' | 'premium_demo';

export interface TenantBranding {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  publicName?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  branding?: TenantBranding;
  /** Runtime commercial assignment, managed manually by a Platform Owner. */
  planId?: PlanId;
  subscriptionStatus?: SubscriptionStatus;
  trialUntil?: string;
  entitlementOverrides?: Record<string, boolean>;
  limitOverrides?: Record<string, number | null>;
}

export interface Membership {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  status: 'active' | 'inactive';
  permissions: string[];
}

export type ActorRole = MembershipRole | 'platform_owner';

export interface PlatformSupportAccess {
  tenantId: string;
  actorId: string;
  reason: string;
  expiresAt: string;
  revokedAt?: string;
  auditLogId: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: ActorRole;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface Professional {
  id: string;
  tenantId: string;
  userId?: string;
  displayName: string;
  specialty?: string;
  status: 'active' | 'inactive';
}

export interface Patient {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  searchName: string;
  status: 'active' | 'inactive';
}

export interface Procedure {
  id: string;
  tenantId: string;
  name: string;
  durationMinutes: number;
  defaultPriceCents?: number;
  active: boolean;
}

export interface ScheduleResource {
  id: string;
  tenantId: string;
  name: string;
  type: 'chair' | 'room' | 'equipment';
  active: boolean;
}

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  procedureIds: string[];
  resourceId?: string;
  notes?: string;
}

export interface Recall {
  id: string;
  tenantId: string;
  patientId: string;
  professionalId?: string;
  reason: string;
  dueAt: string;
  status: RecallStatus;
  lastContactAt?: string;
}

export interface PatientIntakeSubmission {
  id: string;
  tenantId: string;
  tokenId: string;
  status: IntakeStatus;
  name: string;
  phone?: string;
  email?: string;
  submittedAt: string;
}

export interface UsageCounter {
  tenantId: string;
  period: string;
  metric: 'whatsapp_messages' | 'ai_minutes' | 'storage_bytes' | 'invoices_issued';
  value: number;
}

export interface ClinicalRecord {
  id: string;
  tenantId: string;
  patientId: string;
  dentistId: string;
  appointmentId?: string;
  recordType: 'evolution' | 'procedure' | 'note';
  content: string;
  createdAt: string;
  createdBy: string;
  auditLogId?: string;
}

export interface ClinicalRecordAmendment {
  id: string;
  recordId: string;
  tenantId: string;
  patientId: string;
  reason: string;
  content: string;
  createdAt: string;
  createdBy: string;
  professionalId?: string;
  auditLogId?: string;
}

export interface ScheduleBlock {
  id: string;
  tenantId: string;
  professionalId?: string;
  resourceId?: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  active: boolean;
}

export interface ClinicalPhoto {
  id: string;
  tenantId: string;
  patientId: string;
  capturedAt: string;
  status: ClinicalPhotoStatus;
  region?: string;
  teeth: string[];
  tags: string[];
  phase?: string;
  view?: string;
  r2ObjectKey?: string;
  localCacheKey?: string;
  contentType: string;
  originalName: string;
  createdBy?: string;
}
