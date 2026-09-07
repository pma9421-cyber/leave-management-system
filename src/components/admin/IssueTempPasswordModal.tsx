import React, { useEffect, useState } from 'react';
import { PasswordResetRequest } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, KeyRound, Copy, Check, ShieldCheck, AlertCircle, Sparkles, Info } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCustomPassword('');
    setIssuedPassword(null);
    setCopied(false);
    setErrorMsg('');
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const handleGenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let body = '';
    const values = new Uint32Array(8);
    crypto.getRandomValues(values);
    for (const v of values) body += chars[v % chars.length];
    setCustomPassword(`T!${body}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await issueTempPassword(request.id, customPassword || undefined);
      if (res.success && res.tempPassword) {
        setIssuedPassword(res.tempPassword);
        onSuccess?.();
      } else {
        setErrorMsg(res.error || '임시 비밀번호 발급에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!issuedPassword) return;
    await navigator.clipboard.writeText(issuedPassword);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">임시 비밀번호 발급</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer">
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
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between gap-3"><span className="text-slate-500">신청자</span><span className="font-bold">{request.userName} ({request.userRole})</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">이메일</span><span className="font-mono">{request.userEmail}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">사업자번호</span><span className="font-mono">{request.businessNumber}</span></div>
            </div>

            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-800 text-xs flex gap-2 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>발급 즉시 기존 로그인 비밀번호가 이 임시 비밀번호로 변경됩니다. 사용자는 임시 비밀번호로 새 비밀번호를 등록하기 전에는 정상 로그인할 수 없습니다.</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">발급할 임시 비밀번호</label>
                <button type="button" onClick={handleGenerate} className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 cursor-pointer">
                  <Sparkles className="w-3 h-3" /> 랜덤 생성
                </button>
              </div>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="비워두면 서버에서 안전하게 자동 생성"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">최소 8자리 이상을 권장합니다. 발급된 값은 이 화면에서 1회 확인 후 사용자에게 직접 전달하세요.</p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-xs font-semibold cursor-pointer">취소</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer">
                {loading ? '발급 중...' : '임시 비밀번호 발급'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">임시 비밀번호 발급 완료</h4>
              <p className="text-xs text-slate-500 mt-1">아래 비밀번호를 {request.userName} 님에게 직접 전달해 주세요.</p>
            </div>
            <div className="p-4 bg-slate-900 text-amber-300 rounded-xl font-mono text-lg font-bold flex items-center justify-between gap-3">
              <span className="break-all">{issuedPassword}</span>
              <button type="button" onClick={handleCopy} className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs flex items-center gap-1.5 cursor-pointer">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800">
              보안을 위해 임시 비밀번호 원문은 DB에 저장하지 않습니다. 창을 닫기 전에 복사해 전달하세요. 사용자는 로그인 화면의 <strong>비밀번호 찾기 → 2단계 새 비밀번호 등록</strong>에서 변경합니다.
            </div>
            <button type="button" onClick={onClose} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">확인</button>
          </div>
        )}
      </div>
    </div>
  );
};
