import React, { createContext, useContext, useState, useEffect } from 'react';
import { LeaveType, LeaveRequest, QuotaAdjustmentLog } from '../types.ts';
import { INITIAL_LEAVE_TYPES, INITIAL_LEAVE_REQUESTS } from '../data/initialData.ts';
import { calculateLeaveDeduction } from '../utils/leaveUtils.ts';
import { useAuth } from './AuthContext.tsx';
import { useAuditLogSafe } from './AuditLogContext.tsx';

interface LeaveContextType {
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  quotaAdjustments: QuotaAdjustmentLog[];
  addLeaveType: (newType: Omit<LeaveType, 'id'>) => { success: boolean; error?: string };
  deleteLeaveType: (typeId: string) => { success: boolean; error?: string };
  toggleLeaveTypeActive: (typeId: string) => void;
  submitLeaveRequest: (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    requestedDays: number;
  }) => { success: boolean; error?: string };
  adminProxySubmitLeave: (data: {
    targetUserId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    requestedDays: number;
    immediateApprove?: boolean;
  }) => { success: boolean; error?: string };
  updateLeaveRequest: (
    requestId: string,
    data: {
      leaveTypeId?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
      requestedDays?: number;
    }
  ) => { success: boolean; error?: string };
  deleteLeaveRequest: (requestId: string) => { success: boolean; error?: string };
  approveLeaveRequest: (requestId: string, comment?: string) => { success: boolean; error?: string };
  rejectLeaveRequest: (requestId: string, rejectionReason?: string) => { success: boolean; error?: string };
  cancelLeaveRequest: (requestId: string) => { success: boolean; error?: string };
  adjustQuota: (targetUserId: string, newDays: number, reason?: string, year?: number) => { success: boolean; error?: string };
  quickAdjustQuota: (targetUserId: string, delta: number, year?: number) => { success: boolean; error?: string };
  workYear: number;
  setWorkYear: (year: number) => void;
  resetToSampleData: () => void;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

const LEAVE_TYPES_KEY = 'leave_app_types_v1';
const LEAVE_REQUESTS_KEY = 'leave_app_requests_prod_v1';
const QUOTA_LOGS_KEY = 'leave_app_quota_logs_prod_v1';
const WORK_YEAR_KEY = 'leave_app_work_year_v1';

export const LeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, updateUserQuota, updateUserUsedDays, getUserQuota } = useAuth();
  const auditLog = useAuditLogSafe();

  const [workYear, setWorkYearState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(WORK_YEAR_KEY);
      if (saved) return Number(saved);
    } catch (e) {
      console.error('Failed to load work year', e);
    }
    return 2026;
  });

  const setWorkYear = (yr: number) => {
    setWorkYearState(yr);
    try {
      localStorage.setItem(WORK_YEAR_KEY, String(yr));
    } catch (e) {
      console.error('Failed to save work year', e);
    }
  };

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(() => {
    try {
      const saved = localStorage.getItem(LEAVE_TYPES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load leave types', e);
    }
    return INITIAL_LEAVE_TYPES;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      // Clear legacy requests cache from testing
      localStorage.removeItem('leave_app_requests_v1');
      localStorage.removeItem('leave_app_requests_v2');
      const saved = localStorage.getItem(LEAVE_REQUESTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load leave requests', e);
    }
    return [];
  });

  const [quotaAdjustments, setQuotaAdjustments] = useState<QuotaAdjustmentLog[]>(() => {
    try {
      localStorage.removeItem('leave_app_quota_logs_v1');
      const saved = localStorage.getItem(QUOTA_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load quota logs', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LEAVE_TYPES_KEY, JSON.stringify(leaveTypes));
    } catch (e) {
      console.error('Failed to save leave types', e);
    }
  }, [leaveTypes]);

  useEffect(() => {
    try {
      localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(leaveRequests));
    } catch (e) {
      console.error('Failed to save leave requests', e);
    }
  }, [leaveRequests]);

  useEffect(() => {
    try {
      localStorage.setItem(QUOTA_LOGS_KEY, JSON.stringify(quotaAdjustments));
    } catch (e) {
      console.error('Failed to save quota adjustments', e);
    }
  }, [quotaAdjustments]);

  // Add extensible custom leave type
  const addLeaveType = (newType: Omit<LeaveType, 'id'>) => {
    const trimmedName = newType.name.trim();
    if (!trimmedName) {
      return { success: false, error: '휴가 유형명을 입력해 주세요.' };
    }
    if (leaveTypes.some((t) => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: '이미 동일한 이름의 휴가 유형이 존재합니다.' };
    }

    const created: LeaveType = {
      ...newType,
      id: `type-${Date.now()}`,
      name: trimmedName,
      code: newType.code.trim().toUpperCase() || `CUSTOM_${Date.now()}`,
      isActive: true,
      isCustom: true,
    };

    setLeaveTypes((prev) => [...prev, created]);
    return { success: true };
  };

  const deleteLeaveType = (typeId: string) => {
    if (leaveTypes.length <= 1) {
      return { success: false, error: '최소 1개 이상의 휴가 종류가 유지되어야 합니다.' };
    }
    const target = leaveTypes.find((t) => t.id === typeId);
    if (!target) {
      return { success: false, error: '삭제할 휴가 종류를 찾을 수 없습니다.' };
    }

    setLeaveTypes((prev) => prev.filter((t) => t.id !== typeId));
    return { success: true };
  };

  const toggleLeaveTypeActive = (typeId: string) => {
    setLeaveTypes((prev) =>
      prev.map((t) => (t.id === typeId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  // Admin proxy leave request (대리 신청)
  const adminProxySubmitLeave = (data: {
    targetUserId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestedDays: number;
    immediateApprove?: boolean;
  }) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const targetUser = users.find((u) => u.id === data.targetUserId);
    if (!targetUser) {
      return { success: false, error: '대상 직원을 찾을 수 없습니다.' };
    }

    const leaveType = leaveTypes.find((t) => t.id === data.leaveTypeId);
    if (!leaveType) {
      return { success: false, error: '유효하지 않은 휴가 유형입니다.' };
    }

    if (!data.startDate || !data.endDate) {
      return { success: false, error: '휴가 날짜를 지정해 주세요.' };
    }

    if (data.requestedDays <= 0) {
      return { success: false, error: '유효한 휴가 일수를 계산할 수 없습니다.' };
    }

    const reqYear = data.startDate ? parseInt(data.startDate.slice(0, 4), 10) : workYear;
    const quota = getUserQuota(targetUser.id, reqYear);
    const remainingDays = Number((quota.totalLeaveDays - quota.usedLeaveDays).toFixed(1));
    const effectiveDeduction = calculateLeaveDeduction(leaveType, data.requestedDays);

    // 연차 초과(가불/마이너스) 사용 지원: 잔여 연차를 초과해도 신청 및 결재 가능하며 남은 연차가 음수(-)로 표기됨
    // (익년도 이월 시 음수 연차가 그대로 이월되어 자동 차감 정산)

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const isAutoApprove = data.immediateApprove !== false;

    const newRequest: LeaveRequest = {
      id: `req-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userDepartment: targetUser.department,
      userPosition: targetUser.position,
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      startDate: data.startDate,
      endDate: data.endDate,
      requestedDays: data.requestedDays,
      reason: data.reason?.trim() || '',
      status: isAutoApprove ? 'APPROVED' : 'PENDING',
      appliedAt: formattedNow,
      processedAt: isAutoApprove ? formattedNow : undefined,
      processedBy: isAutoApprove ? `${currentUser.name} (관리자 대리 등록)` : undefined,
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    if (isAutoApprove && effectiveDeduction > 0) {
      updateUserUsedDays(targetUser.id, effectiveDeduction, reqYear);
    }

    const proxyTimestamp = reqYear === 2027 ? `${data.startDate} 09:00:00` : undefined;
    auditLog?.addAuditLog({
      actionType: 'LEAVE_APPLY',
      actionTitle: `[관리자 대리 신청] ${reqYear}년도 휴가 등록 (${targetUser.name})`,
      userId: targetUser.id,
      userName: targetUser.name,
      userDepartment: targetUser.department,
      userPosition: targetUser.position,
      operatorId: currentUser.id,
      operatorName: `${currentUser.name} (${currentUser.position})`,
      operatorRole: currentUser.role,
      timestamp: proxyTimestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `관리자가 ${targetUser.name} 직원의 ${reqYear}년도 ${leaveType.name} ${data.requestedDays}일 (${data.startDate} ~ ${data.endDate}) 대리 신청을 등록하였습니다.`,
    });

    if (isAutoApprove) {
      auditLog?.addAuditLog({
        actionType: 'LEAVE_APPROVE',
        actionTitle: `[대리 등록 즉시 승인] ${reqYear}년도 휴가 결재 (${targetUser.name})`,
        userId: targetUser.id,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        userPosition: targetUser.position,
        operatorId: currentUser.id,
        operatorName: `${currentUser.name} (${currentUser.position})`,
        operatorRole: currentUser.role,
        timestamp: proxyTimestamp,
        ipAddress: '192.168.1.12',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `${targetUser.name} 직원의 ${reqYear}년도 ${leaveType.name} ${data.requestedDays}일 신청이 즉시 승인 및 ${effectiveDeduction}일 차감 처리되었습니다.`,
      });
    }

    return { success: true };
  };

  // Submit leave request as Employee
  const submitLeaveRequest = (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestedDays: number;
  }) => {
    if (!currentUser) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const leaveType = leaveTypes.find((t) => t.id === data.leaveTypeId);
    if (!leaveType) {
      return { success: false, error: '유효하지 않은 휴가 유형입니다.' };
    }

    if (!data.startDate || !data.endDate) {
      return { success: false, error: '휴가 시작일과 종료일을 지정해 주세요.' };
    }

    if (data.requestedDays <= 0) {
      return { success: false, error: '유효한 휴가 일수를 계산할 수 없습니다.' };
    }

    // Check quota balance if leave type deducts annual leave
    const reqYear = data.startDate ? parseInt(data.startDate.slice(0, 4), 10) : workYear;
    const quota = getUserQuota(currentUser.id, reqYear);
    const remainingDays = Number((quota.totalLeaveDays - quota.usedLeaveDays).toFixed(1));
    const effectiveDeduction = calculateLeaveDeduction(leaveType, data.requestedDays);

    // 연차 초과(가불/마이너스) 사용 허용: 잔여 연차를 초과하더라도 신청 가능하며 결재 시 남은 연차가 음수로 표기됨

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newRequest: LeaveRequest = {
      id: `req-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userDepartment: currentUser.department,
      userPosition: currentUser.position,
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      startDate: data.startDate,
      endDate: data.endDate,
      requestedDays: data.requestedDays,
      reason: data.reason?.trim() || '',
      status: 'PENDING',
      appliedAt: formattedNow,
    };

    setLeaveRequests((prev) => [newRequest, ...prev]);

    const applyTimestamp = reqYear === 2027 ? `${data.startDate} 09:00:00` : undefined;
    auditLog?.addAuditLog({
      actionType: 'LEAVE_APPLY',
      actionTitle: `${reqYear}년도 휴가 신청 접수 (${currentUser.name})`,
      userId: currentUser.id,
      userName: currentUser.name,
      userDepartment: currentUser.department,
      userPosition: currentUser.position,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      timestamp: applyTimestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${currentUser.name} 직원이 ${reqYear}년도 ${leaveType.name} ${data.requestedDays}일 (${data.startDate} ~ ${data.endDate}) 휴가를 신청하였습니다. (예상 잔여: ${remainingDays - effectiveDeduction}일)`,
    });

    return { success: true };
  };

  // Approve leave request (Admin only)
  const approveLeaveRequest = (requestId: string, _comment?: string) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) {
      return { success: false, error: '신청 내역을 찾을 수 없습니다.' };
    }

    if (targetRequest.status !== 'PENDING') {
      return { success: false, error: '이미 처리된 신청 내역입니다.' };
    }

    const leaveType = leaveTypes.find((t) => t.id === targetRequest.leaveTypeId);
    const deduction = calculateLeaveDeduction(leaveType, targetRequest.requestedDays);
    const reqYear = targetRequest.startDate ? parseInt(targetRequest.startDate.slice(0, 4), 10) : workYear;

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'APPROVED',
              processedAt: formattedNow,
              processedBy: `${currentUser.name} (${currentUser.position})`,
            }
          : r
      )
    );

    // Deduct leave days from employee with target year
    if (deduction > 0) {
      updateUserUsedDays(targetRequest.userId, deduction, reqYear);
    }

    const approveTimestamp = reqYear === 2027 ? `${targetRequest.startDate || '2027-01-01'} 10:00:00` : undefined;
    auditLog?.addAuditLog({
      actionType: 'LEAVE_APPROVE',
      actionTitle: `${reqYear}년도 휴가 결재 승인 (${targetRequest.userName})`,
      userId: targetRequest.userId,
      userName: targetRequest.userName,
      userDepartment: targetRequest.userDepartment,
      userPosition: targetRequest.userPosition,
      operatorId: currentUser.id,
      operatorName: `${currentUser.name} (${currentUser.position})`,
      operatorRole: currentUser.role,
      timestamp: approveTimestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${targetRequest.userName} 직원의 ${reqYear}년도 ${targetRequest.leaveTypeName} ${targetRequest.requestedDays}일 (${targetRequest.startDate} ~ ${targetRequest.endDate}) 결재가 최종 승인되었습니다. (연차 ${deduction}일 차감 반영)`,
      diff: {
        fields: [
          { label: '결재 상태', key: 'status', before: '대기 (PENDING)', after: '승인 (APPROVED)' },
          { label: `${reqYear}년도 연차 차감`, key: 'deduction', before: '0일', after: `${deduction}일` },
        ],
      },
    });

    return { success: true };
  };

  // Reject leave request (Admin only)
  const rejectLeaveRequest = (requestId: string, rejectionReason?: string) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) {
      return { success: false, error: '신청 내역을 찾을 수 없습니다.' };
    }

    if (targetRequest.status !== 'PENDING') {
      return { success: false, error: '이미 처리된 신청 내역입니다.' };
    }

    const reqYear = targetRequest.startDate ? parseInt(targetRequest.startDate.slice(0, 4), 10) : workYear;
    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'REJECTED',
              processedAt: formattedNow,
              processedBy: `${currentUser.name} (${currentUser.position})`,
              rejectionReason: rejectionReason?.trim() || undefined,
            }
          : r
      )
    );

    const rejectTimestamp = reqYear === 2027 ? `${targetRequest.startDate || '2027-01-01'} 10:00:00` : undefined;
    auditLog?.addAuditLog({
      actionType: 'LEAVE_REJECT',
      actionTitle: `${reqYear}년도 휴가 결재 반려 (${targetRequest.userName})`,
      userId: targetRequest.userId,
      userName: targetRequest.userName,
      userDepartment: targetRequest.userDepartment,
      userPosition: targetRequest.userPosition,
      operatorId: currentUser.id,
      operatorName: `${currentUser.name} (${currentUser.position})`,
      operatorRole: currentUser.role,
      timestamp: rejectTimestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${targetRequest.userName} 직원의 ${reqYear}년도 ${targetRequest.leaveTypeName} ${targetRequest.requestedDays}일 결재가 반려되었습니다. (사유: ${rejectionReason?.trim() || '미입력'})`,
      diff: {
        fields: [
          { label: '결재 상태', key: 'status', before: '대기 (PENDING)', after: '반려 (REJECTED)' },
        ],
      },
    });

    return { success: true };
  };

  // Cancel leave request (Employee only, if pending)
  const cancelLeaveRequest = (requestId: string) => {
    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) {
      return { success: false, error: '신청 내역을 찾을 수 없습니다.' };
    }

    if (targetRequest.status !== 'PENDING') {
      return { success: false, error: '대기 중인 신청 건만 취소할 수 있습니다.' };
    }

    const reqYear = targetRequest.startDate ? parseInt(targetRequest.startDate.slice(0, 4), 10) : workYear;

    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'CANCELLED' } : r))
    );

    const cancelTimestamp = reqYear === 2027 ? `${targetRequest.startDate || '2027-01-01'} 10:00:00` : undefined;
    auditLog?.addAuditLog({
      actionType: 'LEAVE_CANCEL',
      actionTitle: `${reqYear}년도 휴가 신청 취소 (${targetRequest.userName})`,
      userId: targetRequest.userId,
      userName: targetRequest.userName,
      userDepartment: targetRequest.userDepartment,
      userPosition: targetRequest.userPosition,
      operatorId: currentUser?.id || targetRequest.userId,
      operatorName: currentUser?.name || targetRequest.userName,
      operatorRole: currentUser?.role || 'EMPLOYEE',
      timestamp: cancelTimestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${targetRequest.userName} 직원이 ${reqYear}년도 ${targetRequest.leaveTypeName} ${targetRequest.requestedDays}일 신청을 취소하였습니다.`,
    });

    return { success: true };
  };

  // Update existing leave request (Admin or Employee)
  const updateLeaveRequest = (
    requestId: string,
    data: {
      leaveTypeId?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
      requestedDays?: number;
    }
  ) => {
    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) {
      return { success: false, error: '신청 내역을 찾을 수 없습니다.' };
    }

    const newTypeId = data.leaveTypeId ?? targetRequest.leaveTypeId;
    const newType = leaveTypes.find((t) => t.id === newTypeId);
    if (!newType) {
      return { success: false, error: '유효한 휴가 종류를 선택해 주세요.' };
    }

    const newDays = data.requestedDays !== undefined ? data.requestedDays : targetRequest.requestedDays;
    if (newDays <= 0) {
      return { success: false, error: '신청 일수는 0보다 커야 합니다.' };
    }

    const reqYear = (data.startDate ?? targetRequest.startDate)
      ? parseInt((data.startDate ?? targetRequest.startDate).slice(0, 4), 10)
      : workYear;

    // If the request is already APPROVED, handle quota deduction difference
    if (targetRequest.status === 'APPROVED') {
      const oldType = leaveTypes.find((t) => t.id === targetRequest.leaveTypeId);
      const oldDeduction = calculateLeaveDeduction(oldType, targetRequest.requestedDays);
      const newDeduction = calculateLeaveDeduction(newType, newDays);
      const diff = Number((newDeduction - oldDeduction).toFixed(1));

      if (diff > 0) {
        const quota = getUserQuota(targetRequest.userId, reqYear);
        const remaining = Number((quota.totalLeaveDays - quota.usedLeaveDays).toFixed(1));
        if (diff > remaining) {
          return {
            success: false,
            error: `추가 차감 일수(${diff}일)가 직원의 ${reqYear}년도 잔여 연차(${remaining}일)를 초과합니다.`,
          };
        }
      }

      if (diff !== 0) {
        updateUserUsedDays(targetRequest.userId, diff, reqYear);
      }
    }

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              leaveTypeId: newTypeId,
              leaveTypeName: newType.name,
              startDate: data.startDate ?? r.startDate,
              endDate: data.endDate ?? r.endDate,
              requestedDays: newDays,
              reason: data.reason !== undefined ? data.reason.trim() : r.reason,
            }
          : r
      )
    );

    return { success: true };
  };

  // Delete leave request (Admin or Applicant)
  const deleteLeaveRequest = (requestId: string) => {
    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) {
      return { success: false, error: '신청 내역을 찾을 수 없습니다.' };
    }

    const reqYear = targetRequest.startDate ? parseInt(targetRequest.startDate.slice(0, 4), 10) : workYear;

    // If already approved, refund deducted days back to the employee
    if (targetRequest.status === 'APPROVED') {
      const leaveType = leaveTypes.find((t) => t.id === targetRequest.leaveTypeId);
      const deduction = calculateLeaveDeduction(leaveType, targetRequest.requestedDays);
      if (deduction > 0) {
        updateUserUsedDays(targetRequest.userId, -deduction, reqYear);
      }
    }

    setLeaveRequests((prev) => prev.filter((r) => r.id !== requestId));
    return { success: true };
  };

  // Adjust quota (Admin only)
  const adjustQuota = (targetUserId: string, newDays: number, reason?: string, year?: number) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    if (newDays < 0) {
      return { success: false, error: '총 연차 일수는 0일 이상이어야 합니다.' };
    }

    const targetYear = year || workYear;
    const quota = getUserQuota(targetUserId, targetYear);
    const prevDays = quota.totalLeaveDays;

    updateUserQuota(targetUserId, newDays, targetYear);

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newLog: QuotaAdjustmentLog = {
      id: `adj-${Date.now()}`,
      userId: targetUserId,
      adminId: currentUser.id,
      adminName: currentUser.name,
      previousDays: prevDays,
      newDays,
      reason: reason?.trim() || `${targetYear}년도 관리자 연차 일수 조정`,
      adjustedAt: formattedNow,
    };

    setQuotaAdjustments((prev) => [newLog, ...prev]);
    return { success: true };
  };

  // Quick adjust quota (+1, -1, +0.5, -0.5, etc.)
  const quickAdjustQuota = (targetUserId: string, delta: number, year?: number) => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const targetYear = year || workYear;
    const quota = getUserQuota(targetUserId, targetYear);

    const newDays = Math.max(0, Number((quota.totalLeaveDays + delta).toFixed(1)));
    const reason =
      delta > 0
        ? `${targetYear}년도 관리자 빠른 연차 추가 (+${delta}일)`
        : `${targetYear}년도 관리자 빠른 연차 차감 (${delta}일)`;

    return adjustQuota(targetUserId, newDays, reason, targetYear);
  };

  const resetToSampleData = () => {
    localStorage.removeItem(LEAVE_TYPES_KEY);
    localStorage.removeItem(LEAVE_REQUESTS_KEY);
    localStorage.removeItem(QUOTA_LOGS_KEY);
    setLeaveTypes(INITIAL_LEAVE_TYPES);
    setLeaveRequests([]);
    setQuotaAdjustments([]);
  };

  return (
    <LeaveContext.Provider
      value={{
        leaveTypes,
        leaveRequests,
        quotaAdjustments,
        addLeaveType,
        deleteLeaveType,
        toggleLeaveTypeActive,
        submitLeaveRequest,
        adminProxySubmitLeave,
        updateLeaveRequest,
        deleteLeaveRequest,
        approveLeaveRequest,
        rejectLeaveRequest,
        cancelLeaveRequest,
        adjustQuota,
        quickAdjustQuota,
        workYear,
        setWorkYear,
        resetToSampleData,
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
};
