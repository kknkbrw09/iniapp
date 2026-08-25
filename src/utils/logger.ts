export type LogType = 'SUCCESS' | 'ERROR' | 'INFO' | 'API';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  title: string;
  details: string;
}

class AppLogger {
  private logs: LogEntry[] = [];
  private listeners: (() => void)[] = [];

  addLog(type: LogType, title: string, details: any) {
    const detailStr = typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      type,
      title,
      details: detailStr,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 60) {
      this.logs.pop();
    }

    this.notify();
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const logger = new AppLogger();
