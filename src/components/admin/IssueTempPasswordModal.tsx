import React, { useState } from 'react';
import { PasswordResetRequest } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface IssueTempPasswordModalProps {
  request: PasswordResetRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const IssueTempPasswordModal: React.FC<IssueTempPasswordModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { issueTempPassword } = useAuth();
  const [customPassword, setCustomPassword] = useState('');
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !request) return null;

  const handleGenerate = () => {
    const randomPw = `temp${Math.floor(100000 + Math.random() * 900000)}!`;
    setCustomPassword(randomPw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = issueTempPassword(request.id, customPassword || undefined);
    if (res.success && res.tempPassword) {
      setIssuedPassword(res.tempPassword);
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || '임시 비밀번호 발급에 실패했습니다.');
    }
  };

  const handleCopy = () => {
    if (issuedPassword) {
      navigator.clipboard.writeText(issuedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              임시 비밀번호 발급
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!issuedPassword ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Request Info Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">신청 대상자:</span>
                <span className="font-bold text-slate-900">{request.userName} ({request.userRole})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">회사 메일:</span>
                <span className="font-mono text-slate-800">{request.userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">사업자등록번호:</span>
                <span className="font-mono text-slate-800">{request.businessNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">신청 일시:</span>
                <span className="text-slate-600">{request.requestedAt}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  발급할 임시 비밀번호
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>랜덤 생성</span>
                </button>
              </div>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="비워두면 자동 난수(temp######!)로 생성됩니다"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                임시 비밀번호로 사용자가 최초 로그인 시 즉시 본인의 새 비밀번호를 설정하도록 강제됩니다.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                임시 비밀번호 즉시 발급
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">임시 비밀번호 발급 완료!</h4>
              <p className="text-xs text-slate-500 mt-1">
                {request.userName} ({request.userEmail}) 님에게 아래 번호를 전달해 주세요.
              </p>
            </div>

            <div className="p-4 bg-slate-900 text-amber-300 rounded-xl font-mono text-lg font-bold flex items-center justify-between">
              <span>{issuedPassword}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-sans flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800">
              사용자가 위 임시 비밀번호로 로그인하면 자동으로 <strong>새 비밀번호 설정 모달</strong>이 표시되어 직접 안전한 비밀번호로 변경하게 됩니다.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              확인 및 창 닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
