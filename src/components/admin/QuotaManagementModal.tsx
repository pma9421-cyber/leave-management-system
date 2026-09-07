import React, { useState, useEffect } from 'react';
import { User } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Calculator,
  RefreshCw,
} from 'lucide-react';

interface QuotaManagementModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  initialYear?: number;
}

export const QuotaManagementModal: React.FC<QuotaManagementModalProps> = ({
  user,
  isOpen,
  onClose,
  initialYear = 2026,
}) => {
  const { getUserQuota, updateUserLeaveBreakdown, rolloverLeaveToNextYear } = useAuth();
  const targetYear = initialYear || 2026;

  // 3 components: statutory, carried over (can be negative or positive), compensatory
  const [statutory, setStatutory] = useState<number>(15);
  const [carriedOver, setCarriedOver] = useState<number>(0);
  const [compensatory, setCompensatory] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (user) {
      const quota = getUserQuota(user.id, targetYear);
      setStatutory(typeof quota.statutoryLeaveDays === 'number' ? quota.statutoryLeaveDays : 15);
      setCarriedOver(typeof quota.carriedOverLeaveDays === 'number' ? quota.carriedOverLeaveDays : 0);
      setCompensatory(typeof quota.compensatoryLeaveDays === 'number' ? quota.compensatoryLeaveDays : 0);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [user, targetYear]);

  if (!isOpen || !user) return null;

  // Auto calculate total
  const calculatedTotal = Number((statutory + carriedOver + compensatory).toFixed(1));
  const currentQuota = getUserQuota(user.id, targetYear);
  const usedDays = currentQuota.usedLeaveDays ?? 0;
  const remainingDays = Number((calculatedTotal - usedDays).toFixed(1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isNaN(statutory) || statutory < 0) {
      setErrorMsg('법정연차는 0일 이상이어야 합니다.');
      return;
    }
    if (isNaN(carriedOver)) {
      setErrorMsg('이월연차 값을 올바르게 입력해 주세요 (음수/양수 가능).');
      return;
    }
    if (isNaN(compensatory) || compensatory < 0) {
      setErrorMsg('보상연차는 0일 이상이어야 합니다.');
      return;
    }

    updateUserLeaveBreakdown(user.id, statutory, carriedOver, compensatory, targetYear);
    setSuccessMsg(`${targetYear}년도 연차 구성(법정/이월/보상)이 성공적으로 저장되었습니다.`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleRolloverNextYear = () => {
    if (!window.confirm(
      `${user.name} 직원의 현재 남은 연차(${remainingDays > 0 ? `+${remainingDays}` : remainingDays}일)를 다음해 이월연차로 반영하시겠습니까?\n\n` +
      `• 새 법정연차: ${statutory}일\n` +
      `• 이월연차: ${remainingDays > 0 ? `+${remainingDays}` : remainingDays}일 (음수/양수 그대로 반영)\n` +
      `• 새 총 연차: ${(statutory + remainingDays).toFixed(1)}일\n` +
      `• 사용일수: 0일로 초기화`
    )) {
      return;
    }

    const res = rolloverLeaveToNextYear(user.id);
    if (res.success) {
      setSuccessMsg(res.message || '다음해 이월 처리가 완료되었습니다.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.message || '이월 처리에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">직원 연차 세부 관리</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {targetYear}년도
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              법정연차 · 이월연차(음수/양수) · 보상연차 개별 조정
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Employee Info Header */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">대상 직원</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{user.name}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700 text-[11px]">
                <Briefcase className="w-3 h-3 text-slate-400" />
                {user.position || '사원'}
              </span>
              <span className="text-slate-400 text-[11px]">({user.department || '부서미지정'})</span>
            </div>
          </div>

          {/* 3 Leave Types Breakdown Inputs */}
          <div className="space-y-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-blue-600" />
              <span>연차 세부 구성 항목 설정</span>
            </div>

            {/* 1. Statutory Leave (법정연차) */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  1. 법정연차 (기본 부여)
                </label>
                <span className="text-[11px] text-slate-400">근로기준법 기준 기본 일수</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  value={statutory}
                  onChange={(e) => setStatutory(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">일</span>
              </div>
            </div>

            {/* 2. Carried-over Leave (이월연차 - 음수/양수 가능) */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  2. 이월연차 (전년도 잔여/초과)
                </label>
                <span className="text-[11px] text-amber-600 font-medium">
                  음수(-) 또는 양수(+) 입력 가능
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="-30"
                  max="30"
                  value={carriedOver}
                  onChange={(e) => setCarriedOver(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 ${
                    carriedOver < 0
                      ? 'border-rose-300 text-rose-600 focus:ring-rose-500 bg-rose-50/20'
                      : carriedOver > 0
                      ? 'border-blue-300 text-blue-700 focus:ring-blue-500'
                      : 'border-slate-200 text-slate-900 focus:ring-blue-500'
                  }`}
                  required
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">일</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                ※ 전년도 초과 사용 시 마이너스(예: -2.0)로 입력하면 총 연차에서 자동 차감됩니다.
              </p>
            </div>

            {/* 3. Compensatory Leave (보상연차) */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  3. 보상연차 (대체/포상)
                </label>
                <span className="text-[11px] text-slate-400">연장근로 대체휴무 또는 포상일수</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={compensatory}
                  onChange={(e) => setCompensatory(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">일</span>
              </div>
            </div>
          </div>

          {/* Auto Calculation & Remaining Result Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs text-slate-400">합산 총 연차일수</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">
                  ({statutory} {carriedOver >= 0 ? `+ ${carriedOver}` : `- ${Math.abs(carriedOver)}`} + {compensatory}) =
                </span>
                <span className="text-lg font-black text-white">{calculatedTotal}일</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">사용된 연차</span>
                <strong className="text-amber-400 text-sm font-bold">{usedDays}일</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">남은 잔여 연차</span>
                <strong
                  className={`text-sm font-black ${
                    remainingDays < 0 ? 'text-rose-400 underline underline-offset-2' : 'text-emerald-400'
                  }`}
                >
                  {remainingDays > 0 ? `${remainingDays}일` : `${remainingDays}일`}
                  {remainingDays < 0 && ' (초과사용)'}
                </strong>
              </div>
            </div>

            {remainingDays < 0 && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  총연차보다 사용일수가 많아 <strong>음수({remainingDays}일)</strong>로 표기됩니다.
                </span>
              </div>
            )}
          </div>

          {/* Rollover to Next Year Button */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-blue-600" />
                <span>익년도 연차 이월 처리</span>
              </span>
              <p className="text-[11px] text-blue-700 mt-0.5">
                현재 잔여 연차(<strong>{remainingDays > 0 ? `+${remainingDays}` : remainingDays}일</strong>)를 다음해 이월연차로 즉시 반영
              </p>
            </div>
            <button
              type="button"
              onClick={handleRolloverNextYear}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <span>이월 실행</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              닫기
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              연차 구성 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
