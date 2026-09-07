import React from 'react';
import { LeaveRequest, LeaveType } from '../../types.ts';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteLeaveRequestModalProps {
  request: LeaveRequest | null;
  leaveTypes: LeaveType[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteLeaveRequestModal: React.FC<DeleteLeaveRequestModalProps> = ({
  request,
  leaveTypes,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !request) return null;

  const leaveType = leaveTypes.find((t) => t.id === request.leaveTypeId);
  const deduction = calculateLeaveDeduction(leaveType, request.requestedDays);
  const isApproved = request.status === 'APPROVED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <span>휴가 신청 내역 삭제</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">신청자:</span>
              <span className="font-bold text-slate-900">
                {request.userName} ({request.userPosition || '사원'})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">휴가 종류 및 기간:</span>
              <span className="font-bold text-blue-700">
                {request.leaveTypeName} · {request.startDate} ~ {request.endDate} ({request.requestedDays}일)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">현재 상태:</span>
              <span className="font-bold text-slate-800">
                {request.status === 'APPROVED'
                  ? '승인 완료'
                  : request.status === 'PENDING'
                  ? '승인 대기중'
                  : request.status === 'REJECTED'
                  ? '반려됨'
                  : '취소됨'}
              </span>
            </div>
          </div>

          {isApproved && deduction > 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">연차 자동 환원 안내</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  해당 건은 이미 <strong>승인 완료</strong>되어 연차 <strong>{deduction}일</strong>이 차감되었습니다.
                  삭제 시 해당 <strong>{deduction}일</strong>이 직원의 잔여 연차로 <strong>즉시 자동 복구(환원)</strong>됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                해당 휴가 신청 기록을 영구히 삭제하시겠습니까? 삭제된 내역은 복구할 수 없습니다.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-confirm-delete-request"
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold shadow-xs cursor-pointer transition-colors"
            >
              삭제 확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
