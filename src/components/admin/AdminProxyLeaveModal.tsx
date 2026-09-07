import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import { X, Calendar, UserCheck, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';

interface AdminProxyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const AdminProxyLeaveModal: React.FC<AdminProxyLeaveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, users, getUserQuota } = useAuth();
  const { leaveTypes, adminProxySubmitLeave } = useLeave();

  // Active leave types
  const activeTypes = useMemo(() => leaveTypes.filter((t) => t.isActive), [leaveTypes]);

  // Filter only users sharing the exact same businessNumber with the current logged-in user
  const companyEmployees = useMemo(() => {
    if (!currentUser) return [];
    const currentBiz = (currentUser.businessNumber || '').replace(/[^0-9]/g, '');
    return users.filter((u) => {
      const uBiz = (u.businessNumber || '').replace(/[^0-9]/g, '');
      const isSameBiz = uBiz === currentBiz;
      const isApproved = u.status === 'APPROVED' || !u.status;
      return isSameBiz && isApproved;
    });
  }, [users, currentUser]);

  // Selected target employee
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>(() => activeTypes[0]?.id || '');

  // Keep selected user valid
  React.useEffect(() => {
    if (companyEmployees.length > 0) {
      if (!selectedUserId || !companyEmployees.some((u) => u.id === selectedUserId)) {
        setSelectedUserId(companyEmployees[0].id);
      }
    } else {
      setSelectedUserId('');
    }
  }, [companyEmployees, selectedUserId]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [immediateApprove, setImmediateApprove] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const targetUser = useMemo(() => {
    return companyEmployees.find((u) => u.id === selectedUserId) || companyEmployees[0] || null;
  }, [companyEmployees, selectedUserId]);

  const selectedType = useMemo(() => {
    return activeTypes.find((t) => t.id === selectedTypeId) || activeTypes[0];
  }, [activeTypes, selectedTypeId]);

  const isHalfDay = selectedType?.code === 'HALF_AM' || selectedType?.code === 'HALF_PM';

  // Target Year derived from startDate
  const reqYear = useMemo(() => {
    if (startDate) {
      const y = parseInt(startDate.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return 2026;
  }, [startDate]);

  // Calculate requested days
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count === 0 ? 1 : count;
  }, [startDate, endDate, isHalfDay]);

  const targetQuota = useMemo(() => {
    if (!targetUser) return { totalLeaveDays: 0, usedLeaveDays: 0, year: reqYear };
    return getUserQuota(targetUser.id, reqYear);
  }, [targetUser, getUserQuota, reqYear]);

  const remainingDays = Number((targetQuota.totalLeaveDays - targetQuota.usedLeaveDays).toFixed(1));
  const effectiveDeduction = calculateLeaveDeduction(selectedType, calculatedDays);
  const isOverQuota = effectiveDeduction > 0 && effectiveDeduction > remainingDays;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetUser) {
      setErrorMsg('대상 직원을 선택해 주세요.');
      return;
    }

    if (!selectedType) {
      setErrorMsg('휴가 종류를 선택해 주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('휴가 날짜를 지정해 주세요.');
      return;
    }

    if (!isHalfDay && new Date(endDate) < new Date(startDate)) {
      setErrorMsg('종료일은 시작일 이후여야 합니다.');
      return;
    }

    // 잔여 연차 초과 신청 허용 (남은 연차가 마이너스로 기록됨)
    setIsSubmitting(true);
    const res = adminProxySubmitLeave({
      targetUserId: targetUser.id,
      leaveTypeId: selectedType.id,
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      requestedDays: calculatedDays,
      immediateApprove,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '대리 휴가 신청에 실패했습니다.');
    } else {
      onSuccess?.(
        `${targetUser.name}님의 휴가가 ${
          immediateApprove ? '즉시 승인 처리' : '승인 대기로 대리 등록'
        }되었습니다.`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="admin-proxy-leave-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">관리자 대리 휴가 신청</h2>
              <p className="text-[11px] text-slate-500">특정 직원을 선택하여 대신 휴가를 등록 및 결재합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Target Employee Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>대상 직원 선택</span> <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-proxy-target-employee"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
              required
              disabled={companyEmployees.length === 0}
            >
              {companyEmployees.length === 0 ? (
                <option value="">등록된 동일 사업장 직원이 없습니다.</option>
              ) : (
                companyEmployees.map((u) => {
                  const q = getUserQuota(u.id, reqYear);
                  const rem = Number((q.totalLeaveDays - q.usedLeaveDays).toFixed(1));
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.position || '사원'}) · 잔여 {rem}일 ({u.email})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Target Employee Balance Card */}
          {targetUser && (
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">{reqYear}년 총 연차</span>
                <span className="text-xs font-bold text-slate-800">{targetQuota.totalLeaveDays}일</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{reqYear}년 사용 연차</span>
                <span className="text-xs font-bold text-slate-600">{targetQuota.usedLeaveDays}일</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{reqYear}년 잔여 연차</span>
                <span className={`text-xs font-bold ${remainingDays < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                  {remainingDays.toFixed(1)}일
                </span>
              </div>
            </div>
          )}

          {/* Overdraft Notice if applicable */}
          {isOverQuota && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              ⚠️ <strong>잔여 연차 초과:</strong> 등록 시 {targetUser.name} 직원의 남은 연차가{' '}
              <strong className="text-rose-600">{(remainingDays - effectiveDeduction).toFixed(1)}일</strong>
              (음수)로 기록되며, 익년도 이월 시 자동 정산됩니다.
            </div>
          )}

          {/* 2. Leave Type Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              휴가 종류 <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeTypes.map((t) => {
                const isSelected = selectedTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTypeId(t.id);
                      if (t.code === 'HALF_AM' || t.code === 'HALF_PM') {
                        setEndDate(startDate);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Date Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              휴가 날짜 <span className="text-rose-500">*</span>
            </label>
            {isHalfDay ? (
              <input
                id="input-proxy-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">시작일</span>
                  <input
                    id="input-proxy-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (new Date(e.target.value) > new Date(endDate)) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">종료일</span>
                  <input
                    id="input-proxy-end-date"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Days Calculation Summary */}
          <div className="flex items-center justify-between py-1.5 px-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-[11px]">
            <span className="text-slate-600">
              신청 일수: <strong className="text-slate-900">{calculatedDays}일</strong>
            </span>
            <span className="text-indigo-700 font-bold">
              차감 예정: {effectiveDeduction.toFixed(1)}일
            </span>
          </div>

          {/* 4. Immediate Approval Option */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs">즉시 승인 처리</span>
              <span className="text-[10px] text-slate-500">
                체크 시 신청과 동시에 승인 완료되며 연차가 자동 차감됩니다.
              </span>
            </div>
            <input
              id="checkbox-proxy-immediate-approve"
              type="checkbox"
              checked={immediateApprove}
              onChange={(e) => setImmediateApprove(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-submit-proxy-leave"
              type="submit"
              disabled={isSubmitting || calculatedDays <= 0}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              대리 휴가 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
