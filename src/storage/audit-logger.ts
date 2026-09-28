import { AuditLogEntry, AttendanceRecord, Employee, Meeting } from '../core/types';
import { IStorageAdapter } from './storage-interface';

const AUDIT_LOG_KEY = 'wp_meet_audit_logs';

export class AuditLogger {
  constructor(private storage: IStorageAdapter) {}

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const logs = await this.storage.getItem<AuditLogEntry[]>(AUDIT_LOG_KEY);
    return logs || [];
  }

  async logChange(
    recordId: string,
    employee: Employee,
    meeting: Meeting,
    changedBy: string,
    oldValue: Partial<AttendanceRecord>,
    newValue: Partial<AttendanceRecord>,
    reason: string
  ): Promise<AuditLogEntry> {
    const logs = await this.getAuditLogs();
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recordId,
      employeeId: employee.id,
      employeeName: employee.name,
      meetingId: meeting.id,
      meetingDate: meeting.date,
      meetingType: meeting.type,
      changedBy: changedBy || 'Admin',
      timestamp: new Date().toISOString(),
      oldValue,
      newValue,
      reason: reason || 'Manual attendance adjustment',
    };

    logs.unshift(entry); // Prepend so newest is first
    await this.storage.setItem(AUDIT_LOG_KEY, logs);
    return entry;
  }

  async clearLogs(): Promise<void> {
    await this.storage.setItem(AUDIT_LOG_KEY, []);
  }
}
