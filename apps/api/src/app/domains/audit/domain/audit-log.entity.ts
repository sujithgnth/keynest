export type AuditOutcome = 'success' | 'failure';
export type AuditMetadata = Record<string, string | number | boolean>;

export interface AuditLog {
  id: string;
  actorUserId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: AuditOutcome;
  metadata: AuditMetadata;
  occurredAt: Date;
}
