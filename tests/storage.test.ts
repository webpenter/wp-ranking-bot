import { describe, it, expect, beforeEach } from 'vitest';
import { AppRepository } from '../src/storage/repository';
import { IStorageAdapter } from '../src/storage/storage-interface';
import { Meeting } from '../src/core/types';

// In-Memory Storage Adapter for unit testing
class MemoryStorageAdapter implements IStorageAdapter {
  private data = new Map<string, any>();

  async getItem<T>(key: string): Promise<T | null> {
    const val = this.data.get(key);
    return val !== undefined ? (JSON.parse(JSON.stringify(val)) as T) : null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(value)));
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

describe('Storage Layer & Audit Logger', () => {
  let repository: AppRepository;
  let adapter: MemoryStorageAdapter;

  beforeEach(async () => {
    adapter = new MemoryStorageAdapter();
    repository = new AppRepository(adapter);
    await repository.initialize();
  });

  it('initializes repository with employees and default seed fixtures', async () => {
    const employees = await repository.getEmployees();
    expect(employees.length).toBeGreaterThan(5);
    expect(employees.find((e) => e.name === 'Ali Hassan')).toBeDefined();
  });

  it('locks participant first join timestamp on multiple rejoins', async () => {
    const employees = await repository.getEmployees();
    const emp = employees[0];

    const testMeeting: Meeting = {
      id: 'meet-test-live',
      code: 'meet.google.com/test-live',
      title: 'Live Standup Test',
      type: 'standup',
      date: '2026-09-29',
      scheduledStart: '2026-09-29T10:00:00.000Z',
      scheduledEnd: '2026-09-29T10:30:00.000Z',
      status: 'active',
      timezone: 'UTC',
      createdAt: '2026-09-29T10:00:00.000Z',
    };
    await repository.saveMeeting(testMeeting);

    // First join at exactly 10:00:15 (+5.0 $WP on-time)
    const joinTime1 = `${testMeeting.date}T10:00:15.000Z`;
    const rec1 = await repository.recordParticipantJoin(testMeeting.id, emp.id, joinTime1);
    expect(rec1.isOnTime).toBe(true);
    expect(rec1.dailyScore).toBe(5.0);
    expect(rec1.joinedAt).toBe(joinTime1);

    // Second join 20 minutes later (e.g. browser refresh or rejoin)
    const joinTime2 = `${testMeeting.date}T10:20:00.000Z`;
    const rec2 = await repository.recordParticipantJoin(testMeeting.id, emp.id, joinTime2);

    // Must preserve first join timestamp!
    expect(rec2.joinedAt).toBe(joinTime1);
    expect(rec2.dailyScore).toBe(5.0);
    expect(rec2.isOnTime).toBe(true);
  });

  it('records an immutable audit log entry when an admin performs manual correction', async () => {
    const records = await repository.getAttendanceRecords();
    const targetRec = records[0];

    await repository.manualAttendanceCorrection(
      targetRec.id,
      { dailyScore: 4.5, notes: 'Adjusted by Admin' },
      'SuperAdmin',
      'Verified 1 minute internet delay'
    );

    const logs = await repository.auditLogger.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].changedBy).toBe('SuperAdmin');
    expect(logs[0].reason).toBe('Verified 1 minute internet delay');
    expect(logs[0].newValue.dailyScore).toBe(4.5);
  });
});
