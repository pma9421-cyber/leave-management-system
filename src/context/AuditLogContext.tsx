import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AuditLog,
  AuditLogActionType,
  AuditLogFilterParams,
  AuditLogResponse,
} from '../types.ts';
import { INITIAL_AUDIT_LOGS } from '../data/initialAuditLogs.ts';

interface AuditLogContextType {
  logs: AuditLog[];
  isLoading: boolean;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  clearAllLogs: () => void;
  resetToInitialLogs: () => void;
  queryLogs: (params: AuditLogFilterParams) => AuditLogResponse;
  exportToCsv: (params?: AuditLogFilterParams) => void;
}

const AuditLogContext = createContext<AuditLogContextType | undefined>(undefined);

const AUDIT_LOGS_STORAGE_KEY = 'leave_app_audit_logs_v3';

const TEST_ACCOUNT_EMAILS = new Set([
  'kim@company.com',
  'lee@company.com',
  'park@company.com',
  'choi@company.com',
  'jung@company.com',
  'manager@segyotax.com',
  'admin@company.com',
]);

export const AuditLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean out test account logs
          parsed = parsed.filter(
            (l: AuditLog) =>
              !TEST_ACCOUNT_EMAILS.has((l.userEmail || '').toLowerCase()) &&
              !l.userId?.startsWith('usr-emp-') &&
              l.userId !== 'usr-admin-segyotax' &&
              l.userId !== 'usr-admin-1'
          );
          if (parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load audit logs from localStorage', e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save audit logs to localStorage', e);
    }
  }, [logs]);

  // Helper to generate current timestamp
  const getFormattedTimestamp = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const addAuditLog = useCallback(
    (newLogData: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }) => {
      const newEntry: AuditLog = {
        ...newLogData,
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: newLogData.timestamp || getFormattedTimestamp(),
      };

      setLogs((prev) => [newEntry, ...prev]);
    },
    []
  );

  const clearAllLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY);
  }, []);

  const resetToInitialLogs = useCallback(() => {
    setLogs(INITIAL_AUDIT_LOGS);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  }, []);

  // Filtered & Paginated query function (emulating server-side indexed query)
  const queryLogs = useCallback(
    (params: AuditLogFilterParams): AuditLogResponse => {
      const {
        search = '',
        actionType = 'ALL',
        department = 'ALL',
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortOrder = 'desc',
      } = params;

      let filtered = [...logs];

      // 1. Text Search Filter (User name, email, department, position, operatorName, details)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (log) =>
            log.userName.toLowerCase().includes(q) ||
            log.userEmail.toLowerCase().includes(q) ||
            (log.userDepartment && log.userDepartment.toLowerCase().includes(q)) ||
            (log.userPosition && log.userPosition.toLowerCase().includes(q)) ||
            log.operatorName.toLowerCase().includes(q) ||
            (log.details && log.details.toLowerCase().includes(q)) ||
            log.ipAddress.toLowerCase().includes(q)
        );
      }

      // 2. Action Type Filter
      if (actionType && actionType !== 'ALL') {
        filtered = filtered.filter((log) => log.actionType === actionType);
      }

      // 3. Department Filter
      if (department && department !== 'ALL') {
        filtered = filtered.filter((log) => log.userDepartment === department);
      }

      // 4. Date Range Filter
      if (startDate) {
        const start = `${startDate} 00:00:00`;
        filtered = filtered.filter((log) => log.timestamp >= start);
      }
      if (endDate) {
        const end = `${endDate} 23:59:59`;
        filtered = filtered.filter((log) => log.timestamp <= end);
      }

      // 5. Sorting
      filtered.sort((a, b) => {
        return sortOrder === 'desc'
          ? b.timestamp.localeCompare(a.timestamp)
          : a.timestamp.localeCompare(b.timestamp);
      });

      // Calculate Stats
      const todayStr = new Date().toISOString().split('T')[0];
      const totalLogs = logs.length;
      const todayLogs = logs.filter((l) => l.timestamp.startsWith(todayStr)).length;
      const securityEvents = logs.filter(
        (l) => l.actionType === 'ROLE_CHANGE' || l.actionType === 'STATUS_CHANGE'
      ).length;
      const loginEvents = logs.filter(
        (l) => l.actionType === 'LOGIN' || l.actionType === 'LOGOUT'
      ).length;

      // 6. Pagination
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const safePage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (safePage - 1) * limit;
      const paginatedData = filtered.slice(startIndex, startIndex + limit);

      return {
        success: true,
        data: paginatedData,
        pagination: {
          total,
          page: safePage,
          limit,
          totalPages,
        },
        stats: {
          totalLogs,
          todayLogs,
          securityEvents,
          loginEvents,
        },
      };
    },
    [logs]
  );

  // CSV / Excel Export with UTF-8 BOM to prevent Korean character corruption in Excel
  const exportToCsv = useCallback(
    (params?: AuditLogFilterParams) => {
      // Get all filtered logs (without pagination slicing)
      let dataToExport = [...logs];
      if (params) {
        const {
          search = '',
          actionType = 'ALL',
          department = 'ALL',
          startDate,
          endDate,
          sortOrder = 'desc',
        } = params;

        if (search.trim()) {
          const q = search.trim().toLowerCase();
          dataToExport = dataToExport.filter(
            (log) =>
              log.userName.toLowerCase().includes(q) ||
              log.userEmail.toLowerCase().includes(q) ||
              (log.userDepartment && log.userDepartment.toLowerCase().includes(q)) ||
              log.operatorName.toLowerCase().includes(q) ||
              (log.details && log.details.toLowerCase().includes(q)) ||
              log.ipAddress.toLowerCase().includes(q)
          );
        }
        if (actionType && actionType !== 'ALL') {
          dataToExport = dataToExport.filter((log) => log.actionType === actionType);
        }
        if (department && department !== 'ALL') {
          dataToExport = dataToExport.filter((log) => log.userDepartment === department);
        }
        if (startDate) {
          dataToExport = dataToExport.filter((log) => log.timestamp >= `${startDate} 00:00:00`);
        }
        if (endDate) {
          dataToExport = dataToExport.filter((log) => log.timestamp <= `${endDate} 23:59:59`);
        }
        dataToExport.sort((a, b) =>
          sortOrder === 'desc'
            ? b.timestamp.localeCompare(a.timestamp)
            : a.timestamp.localeCompare(b.timestamp)
        );
      }

      const headers = [
        '로그ID',
        '작업일시',
        '이력유형',
        '작업제목',
        '대상자명',
        '대상자이메일',
        '소속부서',
        '직급',
        '권한등급',
        '작업자',
        '접속IP',
        '작업상세내용',
        '변경전후내역',
      ];

      const actionTypeLabels: Record<AuditLogActionType, string> = {
        ACCOUNT_CREATE: '계정 생성',
        PROFILE_UPDATE: '정보 수정',
        ROLE_CHANGE: '권한 변경',
        STATUS_CHANGE: '상태 변경/승인',
        ACCOUNT_DELETE: '계정 삭제',
        LOGIN: '로그인',
        LOGOUT: '로그아웃',
        QUOTA_CHANGE: '연차 조정',
        PASSWORD_RESET: '비밀번호 변경',
        YEAR_TRANSITION: '연도 전환/이월',
        QUOTA_GRANT: '신규 연차 부여',
        LEAVE_DEDUCTION: '연차 차감',
        LEAVE_APPLY: '연차 신청',
        LEAVE_APPROVE: '결재 승인',
        LEAVE_REJECT: '결재 반려',
        LEAVE_CANCEL: '결재 취소',
      };

      const rows = dataToExport.map((log) => {
        let diffStr = '';
        if (log.diff?.fields) {
          diffStr = log.diff.fields
            .map((f) => `[${f.label}] ${f.before} -> ${f.after}`)
            .join(' | ');
        }

        return [
          log.id,
          log.timestamp,
          actionTypeLabels[log.actionType] || log.actionType,
          log.actionTitle,
          log.userName,
          log.userEmail,
          log.userDepartment || '-',
          log.userPosition || '-',
          log.userRole,
          log.operatorName,
          log.ipAddress,
          (log.details || '').replace(/"/g, '""'),
          diffStr.replace(/"/g, '""'),
        ];
      });

      const csvContent =
        '\uFEFF' + // UTF-8 BOM
        [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}`;
      link.setAttribute('href', url);
      link.setAttribute('download', `account_audit_logs_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [logs]
  );

  return (
    <AuditLogContext.Provider
      value={{
        logs,
        isLoading,
        addAuditLog,
        clearAllLogs,
        resetToInitialLogs,
        queryLogs,
        exportToCsv,
      }}
    >
      {children}
    </AuditLogContext.Provider>
  );
};

export const useAuditLog = () => {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLog must be used within an AuditLogProvider');
  }
  return context;
};

export const useAuditLogSafe = () => {
  return useContext(AuditLogContext);
};
