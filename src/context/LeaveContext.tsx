import React, { createContext, useContext, useState, useEffect } from 'react';
import { LeaveType, LeaveRequest, QuotaAdjustmentLog } from '../types.ts';
import { INITIAL_LEAVE_TYPES, INITIAL_LEAVE_REQUESTS } from '../data/initialData.ts';
import { calculateLeaveDeduction } from '../utils/leaveUtils.ts';
import { useAuth } from './AuthContext.tsx';
import { useAuditLogSafe } from './AuditLogContext.tsx';
import { supabase } from '../lib/supabase.ts';

interface LeaveContextType {
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  quotaAdjustments: QuotaAdjustmentLog[];
  addLeaveType: (newType: Omit<LeaveType, 'id'>) => Promise<{ success: boolean; error?: string }>;
  deleteLeaveType: (typeId: string) => Promise<{ success: boolean; error?: string }>;
  toggleLeaveTypeActive: (typeId: string) => Promise<{ success: boolean; error?: string }>;
  submitLeaveRequest: (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    requestedDays: number;
  }) => Promise<{ success: boolean; error?: string }>;
  adminProxySubmitLeave: (data: {
    targetUserId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    requestedDays: number;
    immediateApprove?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
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
  deleteLeaveRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  approveLeaveRequest: (requestId: string, comment?: string) => Promise<{ success: boolean; error?: string }>;
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


  // Supabase 중앙 DB에서 휴가유형/휴가신청을 다시 불러옵니다.
  // DB에 존재하는 항목은 DB를 기준으로 하며, 과거 로컬 전용 데이터는 함께 유지합니다.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const hydrateCentralLeaveData = async () => {
      try {
        const { data: typeRows, error: typeError } = await supabase
          .from('leave_types')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });
        if (typeError) throw typeError;
        if (cancelled) return;

        const typeMap = new Map<string, LeaveType>();
        const dbTypes: LeaveType[] = (typeRows || []).map((t: any) => {
          const mapped: LeaveType = {
            id: t.id,
            name: t.name,
            code: t.code,
            deductionDays: Number(t.deduction_days || 0),
            isPaid: Boolean(t.is_paid),
            description: t.description || '',
            color: t.color || '#3b82f6',
            isActive: Boolean(t.is_active),
            isCustom: Boolean(t.is_custom),
          };
          typeMap.set(t.id, mapped);
          return mapped;
        });

        // DB 휴가유형이 있으면 DB를 단일 기준으로 사용합니다.
        // 이렇게 해야 삭제한 유형이 localStorage 때문에 다시 나타나지 않습니다.
        if (dbTypes.length > 0) setLeaveTypes(dbTypes);

        const { data: rows, error } = await supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (cancelled) return;

        const mappedRequests: LeaveRequest[] = (rows || []).map((r: any) => {
          const u = users.find((user) => user.id === r.user_id);
          const t = typeMap.get(r.leave_type_id) || dbTypes.find((x) => x.id === r.leave_type_id);
          return {
            id: r.id,
            userId: r.user_id,
            userName: u?.name || '직원',
            userDepartment: u?.department,
            userPosition: u?.position || '사원',
            leaveTypeId: r.leave_type_id,
            leaveTypeName: t?.name || '휴가',
            startDate: r.start_date,
            endDate: r.end_date,
            requestedDays: Number(r.requested_days || 0),
            reason: r.reason || '',
            status: r.status,
            appliedAt: r.created_at ? String(r.created_at).replace('T', ' ').slice(0, 19) : '',
            processedAt: r.processed_at ? String(r.processed_at).replace('T', ' ').slice(0, 19) : undefined,
            processedBy: r.processed_by ? '관리자' : undefined,
            rejectionReason: r.rejection_reason || undefined,
          };
        });

        // Supabase DB를 휴가신청의 단일 기준으로 사용합니다.
        // 과거 localStorage에서 만든 req-... 임시 ID는 UUID RPC와 호환되지 않으므로 복원하지 않습니다.
        setLeaveRequests(mappedRequests);
      } catch (e) {
        console.error('Failed to hydrate leave data from Supabase', e);
      }
    };

    void hydrateCentralLeaveData();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, users.length]);

  // 휴가 유형 추가 - Supabase 중앙 DB에 영구 저장
  const addLeaveType = async (newType: Omit<LeaveType, 'id'>) => {
    const trimmedName = newType.name.trim();
    if (!trimmedName) return { success: false, error: '휴가 유형명을 입력해 주세요.' };
    if (leaveTypes.some((t) => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, error: '이미 동일한 이름의 휴가 유형이 존재합니다.' };
    }

    try {
      const { data, error } = await supabase.rpc('create_leave_type', {
        p_name: trimmedName,
        p_code: newType.code.trim().toUpperCase() || `CUSTOM_${Date.now()}`,
        p_deduction_days: Number(newType.deductionDays || 0),
        p_is_paid: Boolean(newType.isPaid),
        p_description: newType.description || '',
        p_color: newType.color || '#3b82f6',
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row?.id) {
        setLeaveTypes((prev) => [...prev, {
          id: row.id,
          name: row.name,
          code: row.code,
          deductionDays: Number(row.deduction_days || 0),
          isPaid: Boolean(row.is_paid),
          description: row.description || '',
          color: row.color || '#3b82f6',
          isActive: Boolean(row.is_active),
          isCustom: Boolean(row.is_custom),
        }]);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '휴가 유형을 DB에 저장하지 못했습니다.' };
    }
  };

  // 휴가 유형 삭제 - 실제 삭제 대신 DB에서 deleted 처리하여 과거 신청 FK는 보존
  const deleteLeaveType = async (typeId: string) => {
    if (leaveTypes.length <= 1) return { success: false, error: '최소 1개 이상의 휴가 종류가 유지되어야 합니다.' };
    const target = leaveTypes.find((t) => t.id === typeId);
    if (!target) return { success: false, error: '삭제할 휴가 종류를 찾을 수 없습니다.' };
    try {
      const { error } = await supabase.rpc('delete_leave_type', { p_type_id: typeId });
      if (error) throw error;
      setLeaveTypes((prev) => prev.filter((t) => t.id !== typeId));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '휴가 유형 삭제에 실패했습니다.' };
    }
  };

  const toggleLeaveTypeActive = async (typeId: string) => {
    const target = leaveTypes.find((t) => t.id === typeId);
    if (!target) return { success: false, error: '휴가 유형을 찾을 수 없습니다.' };
    try {
      const { error } = await supabase.rpc('set_leave_type_active', {
        p_type_id: typeId,
        p_active: !target.isActive,
      });
      if (error) throw error;
      setLeaveTypes((prev) => prev.map((t) => t.id === typeId ? { ...t, isActive: !t.isActive } : t));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '휴가 유형 상태 변경에 실패했습니다.' };
    }
  };

  // Admin proxy leave request (대리 신청) - Supabase 중앙 DB 영구 저장
  const adminProxySubmitLeave = async (data: {
    targetUserId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestedDays: number;
    immediateApprove?: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      return { success: false, error: '관리자 권한이 필요합니다.' };
    }

    const targetUser = users.find((u) => u.id === data.targetUserId);
    if (!targetUser) return { success: false, error: '대상 직원을 찾을 수 없습니다.' };

    const leaveType = leaveTypes.find((t) => t.id === data.leaveTypeId);
    if (!leaveType) return { success: false, error: '유효하지 않은 휴가 유형입니다.' };
    if (!data.startDate || !data.endDate) return { success: false, error: '휴가 날짜를 지정해 주세요.' };
    if (data.requestedDays <= 0) return { success: false, error: '유효한 휴가 일수를 계산할 수 없습니다.' };

    const reqYear = parseInt(data.startDate.slice(0, 4), 10) || workYear;
    const effectiveDeduction = calculateLeaveDeduction(leaveType, data.requestedDays);
    const isAutoApprove = data.immediateApprove !== false;

    try {
      const { data: requestId, error } = await supabase.rpc('admin_proxy_submit_leave', {
        p_user_id: targetUser.id,
        p_leave_type_code: leaveType.code,
        p_leave_type_name: leaveType.name,
        p_deduction_days: leaveType.deductionDays,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
        p_requested_days: data.requestedDays,
        p_reason: data.reason?.trim() || null,
        p_immediate_approve: isAutoApprove,
      });
      if (error) throw error;

      const now = new Date();
      const formattedNow = now.toISOString().replace('T', ' ').slice(0, 19);
      const newRequest: LeaveRequest = {
        id: String(requestId),
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

      setLeaveRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id)]);

      // 화면은 즉시 갱신하고, 실제 영구 데이터는 위 RPC에서 이미 DB에 반영됩니다.
      if (isAutoApprove && effectiveDeduction > 0) {
        updateUserUsedDays(targetUser.id, effectiveDeduction, reqYear);
      }

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
        ipAddress: '192.168.1.12',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `관리자가 ${targetUser.name} 직원의 ${reqYear}년도 ${leaveType.name} ${data.requestedDays}일을 대리 등록했으며 중앙 DB에 저장되었습니다.`,
      });

      return { success: true };
    } catch (e: any) {
      console.error('Failed to persist proxy leave request', e);
      return { success: false, error: e?.message || '대리 휴가 신청을 중앙 DB에 저장하지 못했습니다.' };
    }
  };

  // Submit leave request as Employee - Supabase DB에 먼저 저장하고 DB UUID를 사용
  const submitLeaveRequest = async (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    requestedDays: number;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: '로그인이 필요합니다.' };

    const leaveType = leaveTypes.find((t) => t.id === data.leaveTypeId);
    if (!leaveType) return { success: false, error: '유효하지 않은 휴가 유형입니다.' };
    if (!data.startDate || !data.endDate) return { success: false, error: '휴가 시작일과 종료일을 지정해 주세요.' };
    if (data.requestedDays <= 0) return { success: false, error: '유효한 휴가 일수를 계산할 수 없습니다.' };

    const reqYear = parseInt(data.startDate.slice(0, 4), 10) || workYear;
    const quota = getUserQuota(currentUser.id, reqYear);
    const remainingDays = Number((quota.totalLeaveDays - quota.usedLeaveDays).toFixed(1));
    const effectiveDeduction = calculateLeaveDeduction(leaveType, data.requestedDays);

    try {
      // 직접 INSERT는 RLS 정책과 클라이언트 company_id 불일치 시 차단될 수 있으므로,
      // 서버 SECURITY DEFINER RPC가 auth.uid() 기준으로 회사/승인상태를 검증하고 UUID를 생성합니다.
      const { data: requestId, error } = await supabase.rpc('submit_leave_request', {
        p_leave_type_id: leaveType.id,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
        p_requested_days: data.requestedDays,
        p_reason: data.reason?.trim() || null,
      });
      if (error) throw error;
      if (!requestId) throw new Error('휴가 신청 ID를 생성하지 못했습니다.');

      const now = new Date();
      const newRequest: LeaveRequest = {
        id: String(requestId),
        userId: currentUser.id,
        userName: currentUser.name,
        userDepartment: currentUser.department,
        userPosition: currentUser.position,
        leaveTypeId: leaveType.id,
        leaveTypeName: leaveType.name,
        startDate: data.startDate,
        endDate: data.endDate,
        requestedDays: Number(data.requestedDays),
        reason: data.reason?.trim() || '',
        status: 'PENDING',
        appliedAt: now.toISOString().replace('T', ' ').slice(0, 19),
      };

      setLeaveRequests((prev) => [newRequest, ...prev.filter((r) => r.id !== newRequest.id && !r.id.startsWith('req-'))]);

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
        ipAddress: '192.168.1.12',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `${currentUser.name} 직원이 ${reqYear}년도 ${leaveType.name} ${data.requestedDays}일 휴가를 신청했습니다. (예상 잔여: ${remainingDays - effectiveDeduction}일)`,
      });

      return { success: true };
    } catch (e: any) {
      console.error('Failed to persist employee leave request', e);
      return { success: false, error: e?.message || '휴가 신청을 중앙 DB에 저장하지 못했습니다.' };
    }
  };

  // Approve leave request (Admin only) - Supabase DB atomic approval
  const approveLeaveRequest = async (requestId: string, _comment?: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
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

    try {
      // DB에서 신청 상태 변경 + 사용연차 차감을 한 트랜잭션으로 처리합니다.
      const { error } = await supabase.rpc('approve_leave_request', { p_request_id: requestId });
      if (error) throw error;

      const now = new Date();
      const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // 즉시 화면에도 반영합니다. 실제 영구 값은 위 RPC가 DB에 저장합니다.
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

      if (deduction > 0) {
        updateUserUsedDays(targetRequest.userId, deduction, reqYear);
      }

      return { success: true };
    } catch (e: any) {
      console.error('Failed to approve leave request in Supabase', e);
      return { success: false, error: e?.message || '휴가 승인 처리 중 오류가 발생했습니다.' };
    }
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

      // 연차 초과(가불/마이너스) 허용:
      // 승인 완료 건을 수정하여 추가 차감이 발생해도 잔여 연차보다 큰지 검사하지 않습니다.
      // totalLeaveDays - usedLeaveDays 값이 음수가 되면 UI에서 그대로 마이너스 잔여 연차로 표시합니다.

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

  // Delete leave request - Supabase DB에서도 영구 삭제, 승인건은 연차 자동 환원
  const deleteLeaveRequest = async (requestId: string) => {
    const targetRequest = leaveRequests.find((r) => r.id === requestId);
    if (!targetRequest) return { success: false, error: '신청 내역을 찾을 수 없습니다.' };

    const isDbId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId);
    try {
      if (isDbId) {
        const { error } = await supabase.rpc('delete_leave_request_permanently', {
          p_request_id: requestId,
        });
        if (error) throw error;
        // DB RPC가 quota까지 원자적으로 환원하므로 사용자/연차 데이터를 다시 읽도록 이벤트 발생
        window.dispatchEvent(new CustomEvent('leave-db-changed'));
      } else if (targetRequest.status === 'APPROVED') {
        // 과거 localStorage 전용 데이터는 기존 방식으로 환원
        const reqYear = targetRequest.startDate ? parseInt(targetRequest.startDate.slice(0, 4), 10) : workYear;
        const leaveType = leaveTypes.find((t) => t.id === targetRequest.leaveTypeId);
        const deduction = calculateLeaveDeduction(leaveType, targetRequest.requestedDays);
        if (deduction > 0) updateUserUsedDays(targetRequest.userId, -deduction, reqYear);
      }

      setLeaveRequests((prev) => prev.filter((r) => r.id !== requestId));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || '휴가 신청 내역 삭제에 실패했습니다.' };
    }
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
