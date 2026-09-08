import React, { useState, useEffect, useMemo } from 'react';
import { useLeave } from '../../context/LeaveContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { LeaveRequest } from '../../types.ts';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface EditLeaveRequestModalProps {
  request: LeaveRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditLeaveRequestModal: React.FC<EditLeaveRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { leaveTypes, updateLeaveRequest } = useLeave();
  const { users } = useAuth();

  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when request changes
  useEffect(() => {
    if (request) {
      setSelectedTypeId(request.leaveTypeId);
      setStartDate(request.startDate);
      setEndDate(request.endDate);
      setErrorMsg('');
    }
  }, [request, isOpen]);

  const selectedType = useMemo(() => {
    return leaveTypes.find((t) => t.id === selectedTypeId) || leaveTypes[0];
  }, [leaveTypes, selectedTypeId]);

  // Target applicant user for quota validation
  const applicantUser = useMemo(() => {
    if (!request) return null;
    return users.find((u) => u.id === request.userId);
  }, [users, request]);

  // Calculate requested days
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;

    if (selectedType?.code === 'HALF_AM' || selectedType?.code === 'HALF_PM') {
      return 0.5;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

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
  }, [startDate, endDate, selectedType]);

  if (!isOpen || !request) return null;

  const currentType = leaveTypes.find((t) => t.id === request.leaveTypeId);
  const currentDeduction = calculateLeaveDeduction(currentType, request.requestedDays);
  const newDeduction = calculateLeaveDeduction(selectedType, calculatedDays);
  const deductionDiff = Number((newDeduction - currentDeduction).toFixed(1));

  const remainingQuota = applicantUser
    ? Number((applicantUser.totalLeaveDays - applicantUser.usedLeaveDays).toFixed(1))
    : 0;

  const isOverQuota =
    request.status === 'APPROVED'
      ? deductionDiff > 0 && deductionDiff > remainingQuota
      : newDeduction > 0 && newDeduction > remainingQuota;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedType) {
      setErrorMsg('휴가 종류를 선택해 주세요.');
      return;
    }

    if (!startDate || !endDate) {
      setErrorMsg('휴가 일정을 입력해 주세요.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    if (calculatedDays <= 0) {
      setErrorMsg('유효한 근무일 기준 휴가 일수가 0일입니다.');
      return;
    }

    setIsSubmitting(true);
    const finalEndDate =
      selectedType.code === 'HALF_AM' || selectedType.code === 'HALF_PM' ? startDate : endDate;

    const res = updateLeaveRequest(request.id, {
      leaveTypeId: selectedType.id,
      startDate,
      endDate: finalEndDate,
      requestedDays: calculatedDays,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '수정에 실패했습니다.');
    } else {
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">휴가 신청 내역 수정</h2>
              <p className="text-xs text-slate-500">
                {request.userName} · 신청 건 수정
              </p>
            </div>
          </div>
          <button
            id="btn-close-edit-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isOverQuota && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                잔여 연차를 초과하는 수정입니다. 수정 후 잔여 연차는
                <strong> {Number((remainingQuota - (request.status === 'APPROVED' ? Math.max(deductionDiff, 0) : newDeduction)).toFixed(1))}일</strong>로 표시됩니다.
              </span>
            </div>
          )}

          {/* Current Request Status Banner */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold">신청 상태:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  request.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : request.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : request.status === 'CANCELLED'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {request.status === 'APPROVED'
                  ? '승인 완료'
                  : request.status === 'REJECTED'
                  ? '반려됨'
                  : request.status === 'CANCELLED'
                  ? '신청 취소'
                  : '승인 대기중'}
              </span>
            </div>
            {request.status === 'APPROVED' && (
              <p className="text-[11px] text-amber-700 font-medium">
                ※ 이미 승인된 신청 건을 수정할 경우, 변경된 일수 및 차감률 차이가 직원의 연차에 실시간 자동 반영됩니다.
              </p>
            )}
          </div>

          {/* Leave Type Select */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              휴가 종류 선택 <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-edit-leave-type"
              value={selectedTypeId}
              onChange={(e) => {
                setSelectedTypeId(e.target.value);
                const nextType = leaveTypes.find((t) => t.id === e.target.value);
                if (nextType?.code === 'HALF_AM' || nextType?.code === 'HALF_PM') {
                  setEndDate(startDate);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (차감 {t.deductionDays}일 / {t.isPaid ? '유급' : '무급'}) {!t.isActive ? '[비활성]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date range selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                시작일 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-edit-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (selectedType?.code === 'HALF_AM' || selectedType?.code === 'HALF_PM') {
                      setEndDate(e.target.value);
                    } else if (new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                종료일 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-edit-end-date"
                  type="date"
                  value={endDate}
                  disabled={selectedType?.code === 'HALF_AM' || selectedType?.code === 'HALF_PM'}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Calculation summary */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-slate-700">
                수정 후 일수: <strong>{calculatedDays}일</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-blue-800 font-bold">
                차감 연차: {newDeduction.toFixed(1)}일
              </span>
              {request.status === 'APPROVED' && deductionDiff !== 0 && (
                <div className="text-[11px] text-slate-500">
                  (기존 {currentDeduction.toFixed(1)}일 대비 {deductionDiff > 0 ? `+${deductionDiff}일 추가 차감` : `${deductionDiff}일 환원`})
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-submit-edit-request"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
