import React, { useState, useEffect } from 'react';
import { useAuth, formatBizNum, normalizeBizNum } from '../../context/AuthContext.tsx';
import { Building2, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessNumber?: string;
  currentCompanyName?: string;
  onSuccess?: (newCompanyName: string) => void;
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  businessNumber,
  currentCompanyName,
  onSuccess,
}) => {
  const { currentUser, updateCompanyName } = useAuth();

  const targetBizNum = businessNumber || currentUser?.businessNumber || '';
  const initialName = currentCompanyName || currentUser?.companyName || '';

  const [companyNameInput, setCompanyNameInput] = useState(initialName);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCompanyNameInput(initialName);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = companyNameInput.trim();
    if (!trimmed) {
      setErrorMsg('회사명(상호명)을 입력해 주세요.');
      return;
    }

    if (!targetBizNum) {
      setErrorMsg('사업자등록번호 정보가 올바르지 않습니다.');
      return;
    }

    const norm = normalizeBizNum(targetBizNum);
    if (norm === '9999999999' || targetBizNum === '999-99-99999') {
      setErrorMsg('마스터 최고관리자(admin) 계정은 회사명이 admin으로 고정되어 변경할 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    const res = updateCompanyName(targetBizNum, trimmed);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '회사명 변경에 실패했습니다.');
    } else {
      setSuccessMsg(`회사명이 '${trimmed}'(으)로 성공적으로 변경되었습니다.`);
      onSuccess?.(trimmed);
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="modal-edit-company"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">회사명(상호) 기재 및 수정</h2>
              <p className="text-xs text-slate-500">
                관리자 계정 및 소속 사업장의 공식 회사명을 설정합니다.
              </p>
            </div>
          </div>
          <button
            id="btn-close-edit-company-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Business Info Display */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">사업장 사업자번호</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formatBizNum(targetBizNum)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">현재 등록 회사명</span>
              <span className="font-semibold text-slate-700">
                {initialName || '미등록 (회사)'}
              </span>
            </div>
          </div>

          {/* New Company Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              새로운 회사명 (상호명) <span className="text-blue-600">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="input-edit-company-name"
                type="text"
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                placeholder="예: 가나다 주식회사"
                maxLength={40}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>사업자등록증 상의 공식 상호 또는 법인명을 기재해 주세요.</span>
            </p>
          </div>

          {/* Guidance Callout */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold text-blue-950 mb-0.5">안내 사항</p>
            <p className="text-[11px] text-blue-800">
              • 회사명을 수정하면 해당 사업자등록번호를 사용하는 모든 계정(관리자 및 소속 직원)의 회사 정보가 실시간으로 일괄 동기화됩니다.
            </p>
            <p className="text-[11px] text-blue-800 mt-0.5">
              • 감사 이력(Audit Log)에 수정 일시 및 관리자 정보가 안전하게 기록됩니다.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              id="btn-cancel-edit-company"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-submit-edit-company"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '저장 중...' : '회사명 저장'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
