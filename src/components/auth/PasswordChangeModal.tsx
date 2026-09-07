import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { KeyRound, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen }) => {
  const { currentUser, completePasswordChange } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자리 이상으로 입력해 주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다. 다시 입력해 주세요.');
      return;
    }

    setLoading(true);
    const res = completePasswordChange(currentUser.id, newPassword);
    setLoading(false);

    if (!res.success) {
      setError(res.error || '비밀번호 변경에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">새 비밀번호 설정 필수</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            임시 비밀번호로 로그인되었거나 최고 관리자의 요청에 따라 <br />
            계정 보호를 위해 즉시 안전한 새 비밀번호를 설정해야 합니다.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              신규 영구 비밀번호 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                id="input-new-password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="최소 4자리 이상 입력"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              신규 비밀번호 확인 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                id="input-confirm-password"
                required
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="동일하게 한 번 더 입력"
                className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>안내 사항</span>
            </div>
            <p className="text-slate-500">
              새 비밀번호를 설정하시면 임시 비밀번호는 즉시 무효화되며 다음 로그인부터 새 비밀번호가 적용됩니다.
            </p>
          </div>

          <button
            type="submit"
            id="btn-submit-new-password"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? '저장 중...' : '새 비밀번호 등록 및 시스템 입장'}
          </button>
        </form>
      </div>
    </div>
  );
};
