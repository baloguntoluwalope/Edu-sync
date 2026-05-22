import { AuditLog } from '../models/AuditLog';

interface AuditEntry {
  schoolId: string;
  branchId?: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export const logAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    await AuditLog.create(entry);
  } catch {
    // never let audit failure crash the main flow
  }
};