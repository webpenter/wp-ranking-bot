import { Employee, Meeting, AttendanceRecord, Settings, AttendanceStatus, MeetingType } from '../core/types';
import { IStorageAdapter } from './storage-interface';
import { storageAdapter } from './local-storage-adapter';
import { AuditLogger } from './audit-logger';
import { generateSeedData, DEFAULT_SETTINGS } from '../core/mock-data';
import { calculateAttendanceScore } from '../core/scoring';

const EMPLOYEES_KEY = 'wp_meet_employees';
const MEETINGS_KEY = 'wp_meet_meetings';
const RECORDS_KEY = 'wp_meet_records';
const SETTINGS_KEY = 'wp_meet_settings';
const SCHEMA_VERSION_KEY = 'wp_meet_schema_version';
const CURRENT_SCHEMA_VERSION = '3.5_fine_10pkr';

export class AppRepository {
  public auditLogger: AuditLogger;

  constructor(private storage: IStorageAdapter = storageAdapter) {
    this.auditLogger = new AuditLogger(storage);
  }

  /**
   * Initializes the repository with default data if empty or outdated.
   */
  async initialize(): Promise<void> {
    const version = await this.storage.getItem<string>(SCHEMA_VERSION_KEY);
    const existingEmployees = await this.storage.getItem<Employee[]>(EMPLOYEES_KEY);
    
    if (version !== CURRENT_SCHEMA_VERSION || !existingEmployees || existingEmployees.length === 0) {
      await this.resetToSeedData();
    }
  }

  async resetToSeedData(): Promise<void> {
    const seed = generateSeedData();
    await this.storage.setItem(EMPLOYEES_KEY, seed.employees);
    await this.storage.setItem(MEETINGS_KEY, seed.meetings);
    await this.storage.setItem(RECORDS_KEY, seed.records);
    await this.storage.setItem(SETTINGS_KEY, seed.settings);
    await this.storage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
    await this.auditLogger.clearLogs();
  }

  // ================= EMPLOYEES =================
  async getEmployees(): Promise<Employee[]> {
    const data = await this.storage.getItem<Employee[]>(EMPLOYEES_KEY);
    return data || [];
  }

  async saveEmployee(employee: Employee): Promise<Employee> {
    const list = await this.getEmployees();
    const existingIdx = list.findIndex((e) => e.id === employee.id);
    if (existingIdx >= 0) {
      list[existingIdx] = employee;
    } else {
      list.push(employee);
    }
    await this.storage.setItem(EMPLOYEES_KEY, list);
    return employee;
  }

  async deleteEmployee(id: string): Promise<void> {
    const list = await this.getEmployees();
    const filtered = list.filter((e) => e.id !== id);
    await this.storage.setItem(EMPLOYEES_KEY, filtered);
  }

  // ================= MEETINGS =================
  async getMeetings(): Promise<Meeting[]> {
    const data = await this.storage.getItem<Meeting[]>(MEETINGS_KEY);
    return data || [];
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
    const list = await this.getMeetings();
    return list.find((m) => m.id === id) || null;
  }

  async saveMeeting(meeting: Meeting): Promise<Meeting> {
    const list = await this.getMeetings();
    const existingIdx = list.findIndex((m) => m.id === meeting.id);
    if (existingIdx >= 0) {
      list[existingIdx] = meeting;
    } else {
      list.push(meeting);
    }
    await this.storage.setItem(MEETINGS_KEY, list);
    return meeting;
  }

  // ================= ATTENDANCE RECORDS =================
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const data = await this.storage.getItem<AttendanceRecord[]>(RECORDS_KEY);
    return data || [];
  }

  async getRecordsByMeetingId(meetingId: string): Promise<AttendanceRecord[]> {
    const list = await this.getAttendanceRecords();
    return list.filter((r) => r.meetingId === meetingId);
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
    const list = await this.getAttendanceRecords();
    const existingIdx = list.findIndex((r) => r.id === record.id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      list.push(record);
    }
    await this.storage.setItem(RECORDS_KEY, list);
    return record;
  }

  /**
   * Records a live participant join from Google Meet extension.
   * Uses FIRST join timestamp only to prevent double penalty or score dilution on re-joins.
   */
  async recordParticipantJoin(
    meetingId: string,
    employeeId: string,
    joinedAt: Date | string = new Date()
  ): Promise<AttendanceRecord> {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found for id: ${meetingId}`);
    }

    const settings = await this.getSettings();
    const typeSettings = meeting.type === 'eod' ? settings.eod : settings.standup;

    const list = await this.getAttendanceRecords();
    let record = list.find((r) => r.meetingId === meetingId && r.employeeId === employeeId);

    // If already joined previously, keep first join timestamp
    if (record && record.joinedAt) {
      return record;
    }

    const joinedIso = typeof joinedAt === 'string' ? joinedAt : joinedAt.toISOString();
    const result = calculateAttendanceScore(meeting.scheduledStart, joinedIso, typeSettings);

    const now = new Date().toISOString();
    if (record) {
      record.status = result.status;
      record.joinedAt = joinedIso;
      record.minutesLate = result.minutesLate;
      record.dailyScore = result.dailyScore;
      record.isOnTime = result.isOnTime;
      record.notes = result.explanation;
      record.updatedAt = now;
    } else {
      record = {
        id: `rec-${meeting.type}-${meetingId}-${employeeId}`,
        meetingId,
        employeeId,
        meetingType: meeting.type,
        status: result.status,
        joinedAt: joinedIso,
        minutesLate: result.minutesLate,
        dailyScore: result.dailyScore,
        isOnTime: result.isOnTime,
        notes: result.explanation,
        createdAt: now,
        updatedAt: now,
      };
      list.push(record);
    }

    await this.storage.setItem(RECORDS_KEY, list);
    return record;
  }

  /**
   * Manual admin attendance correction with compulsory audit logging.
   */
  async manualAttendanceCorrection(
    recordId: string,
    updates: {
      status?: AttendanceStatus;
      joinedAt?: string;
      dailyScore?: number;
      minutesLate?: number;
      isOnTime?: boolean;
      notes?: string;
    },
    changedBy: string,
    reason: string
  ): Promise<AttendanceRecord> {
    const list = await this.getAttendanceRecords();
    const record = list.find((r) => r.id === recordId);
    if (!record) {
      throw new Error(`Attendance record not found: ${recordId}`);
    }

    const employees = await this.getEmployees();
    const employee = employees.find((e) => e.id === record.employeeId) || {
      id: record.employeeId,
      name: 'Unknown',
      active: true,
      createdAt: '',
    };

    const meeting = (await this.getMeetingById(record.meetingId)) || {
      id: record.meetingId,
      code: '',
      title: 'Standup',
      type: record.meetingType,
      date: record.createdAt.split('T')[0],
      scheduledStart: record.createdAt,
      scheduledEnd: record.createdAt,
      status: 'completed',
      timezone: 'UTC',
      createdAt: record.createdAt,
    };

    const oldValue: Partial<AttendanceRecord> = {
      status: record.status,
      joinedAt: record.joinedAt,
      dailyScore: record.dailyScore,
      minutesLate: record.minutesLate,
      isOnTime: record.isOnTime,
      notes: record.notes,
    };

    // Apply updates
    Object.assign(record, updates, { updatedAt: new Date().toISOString() });

    // Log the change
    await this.auditLogger.logChange(
      record.id,
      employee,
      meeting,
      changedBy,
      oldValue,
      updates,
      reason
    );

    await this.storage.setItem(RECORDS_KEY, list);
    return record;
  }

  // ================= SETTINGS =================
  async getSettings(): Promise<Settings> {
    const data = await this.storage.getItem<Settings>(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    await this.storage.setItem(SETTINGS_KEY, settings);
    return settings;
  }

  // ================= EXPORT / IMPORT =================
  async exportFullDataJSON(): Promise<string> {
    const [employees, meetings, records, settings, auditLogs] = await Promise.all([
      this.getEmployees(),
      this.getMeetings(),
      this.getAttendanceRecords(),
      this.getSettings(),
      this.auditLogger.getAuditLogs(),
    ]);

    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        employees,
        meetings,
        records,
        settings,
        auditLogs,
      },
      null,
      2
    );
  }

  async importFullDataJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (data.employees) await this.storage.setItem(EMPLOYEES_KEY, data.employees);
      if (data.meetings) await this.storage.setItem(MEETINGS_KEY, data.meetings);
      if (data.records) await this.storage.setItem(RECORDS_KEY, data.records);
      if (data.settings) await this.storage.setItem(SETTINGS_KEY, data.settings);
      if (data.auditLogs) await this.storage.setItem('wp_meet_audit_logs', data.auditLogs);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const repository = new AppRepository();
