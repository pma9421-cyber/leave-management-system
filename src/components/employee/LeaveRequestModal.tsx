import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import { X, Calendar, AlertCircle } from 'lucide-react';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, getUserQuota } = useAuth();
  const { leaveTypes, submitLeaveRequest } = useLeave();

  // Active leave types only
  const activeTypes = useMemo(() => leaveTypes.filter((t) => t.isActive), [leaveTypes]);

  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    activeTypes[0]?.id || 'type-annual'
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedType = activeTypes.find((t) => t.id === selectedTypeId) || activeTypes[0];
  const isHalfDay = selectedType?.code === 'HALF_AM' || selectedType?.code === 'HALF_PM';

  // Target Year derived from startDate
  const reqYear = useMemo(() => {
    if (startDate) {
      const y = parseInt(startDate.slice(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return 2026;
  }, [startDate]);

  // Calculate requested days based on date range and type
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;

    if (isHalfDay) {
      return 0.5;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) return 0;

    // Count business days (Monday to Friday)
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return count === 0 ? 1 : count;
  }, [startDate, endDate, isHalfDay]);

  const quota = useMemo(() => {
    if (!currentUser) return { totalLeaveDays: 0, usedLeaveDays: 0, year: reqYear };
    return getUserQuota(currentUser.id, reqYear);
  }, [currentUser, getUserQuota, reqYear]);

  const remainingQuota = Number((quota.totalLeaveDays - quota.usedLeaveDays).toFixed(1));
  const effectiveDeduction = calculateLeaveDeduction(selectedType, calculatedDays);
  const isOverQuota = effectiveDeduction > 0 && effectiveDeduction > remainingQuota;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedType) {
      setErrorMsg('휴가 종류를 선택해 주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('휴가 날짜를 선택해 주세요.');
      return;
    }

    if (!isHalfDay && new Date(endDate) < new Date(startDate)) {
      setErrorMsg('종료일은 시작일 이후여야 합니다.');
      return;
    }

    // 초과 사용 시 남은 연차가 마이너스로 전환됨 안내 후 진행
    setIsSubmitting(true);
    const res = await submitLeaveRequest({
      leaveTypeId: selectedType.id,
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      requestedDays: calculatedDays,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '신청에 실패했습니다.');
    } else {
      onSuccess?.();
      onClose();
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="leave-request-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header - Simple & Compact */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">휴가 신청</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User & Balance Badge */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-slate-600">
              <strong className="text-slate-900 font-semibold">{currentUser.name}</strong> ({currentUser.position || '사원'})
            </span>
            <span className="text-slate-500">
              {reqYear}년 잔여{' '}
              <strong className={remainingQuota < 0 ? 'text-rose-600 font-bold' : 'text-blue-600 font-bold'}>
                {remainingQuota.toFixed(1)}일
              </strong>
            </span>
          </div>

          {/* Overdraft Warning Note */}
          {isOverQuota && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
              ⚠️ <strong>잔여 연차 초과(선사용) 신청:</strong> 신청 승인 시 남은 연차가{' '}
              <strong className="text-rose-600 font-bold">{(remainingQuota - effectiveDeduction).toFixed(1)}일</strong>
              (음수)로 표기되며, 익년도 연차 이월 시 자동 정산/차감됩니다.
            </div>
          )}

          {/* Leave Type Selector - Compact Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              종류 <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeTypes.map((type) => {
                const isSelected = selectedTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedTypeId(type.id);
                      if (type.code === 'HALF_AM' || type.code === 'HALF_PM') {
                        setEndDate(startDate);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker - Simplified */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              날짜 <span className="text-rose-500">*</span>
            </label>
            {isHalfDay ? (
              <div>
                <input
                  id="input-leave-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">시작일</span>
                  <input
                    id="input-leave-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (new Date(e.target.value) > new Date(endDate)) {
                        setEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">종료일</span>
                  <input
                    id="input-leave-end-date"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Calculation 1-line Summary */}
          <div className="flex items-center justify-between py-1.5 px-3 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px]">
            <span className="text-slate-600">
              신청 일수: <strong className="text-slate-900">{calculatedDays}일</strong>
            </span>
            <span className="text-blue-700 font-bold">
              차감 {effectiveDeduction.toFixed(1)}일
            </span>
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
              id="btn-submit-leave-request"
              type="submit"
              disabled={isSubmitting || calculatedDays <= 0}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              신청하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
