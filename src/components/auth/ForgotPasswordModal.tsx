import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.ts';
import { X, KeyRound, AlertCircle, CheckCircle2, Mail, Lock, Info } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBizNum?: string;
  defaultEmail?: string;
  onSuccessReset?: (email: string, bizNum: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const [mode, setMode] = useState<'REQUEST' | 'SET_NEW_PASSWORD'>('REQUEST');
  const [email, setEmail] = useState(defaultEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(defaultEmail || '');
    setError('');
    setSuccess('');
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('password-reset') === '1') {
        setMode('SET_NEW_PASSWORD');
      } else {
        setMode('REQUEST');
      }
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('가입한 이메일 주소를 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/?password-reset=1`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setSuccess('비밀번호 재설정 이메일을 보냈습니다. 이메일의 재설정 링크를 눌러 새 비밀번호를 등록해 주세요.');
    } catch (err: any) {
      setError(err?.message || '비밀번호 재설정 이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');
      setNewPassword('');
      setConfirmPassword('');
      await supabase.auth.signOut();

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('password-reset');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
      setTimeout(() => {
        setMode('REQUEST');
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || '비밀번호 변경에 실패했습니다. 재설정 이메일의 링크를 다시 열어 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">비밀번호 찾기 및 재설정</h2>
              <p className="mt-0.5 text-xs text-slate-500">Supabase 이메일 인증 방식</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {mode === 'REQUEST' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>가입한 이메일 주소로 비밀번호 재설정 링크를 발송합니다. 회사 사업자번호나 이름을 다시 조회하지 않으므로 로그아웃 상태에서도 정상 동작합니다.</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">가입된 이메일 주소</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
              {success && <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success}</span></div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">취소</button>
                <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? '발송 중...' : '재설정 이메일 보내기'}</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                이메일 인증이 확인되었습니다. 사용할 새 비밀번호를 등록해 주세요.
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">새 비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">새 비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>

              {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
              {success && <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>{success}</span></div>}

              <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? '변경 중...' : '새 비밀번호 저장'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
