import React, { useState, useEffect } from 'react';
import { useAuth, formatBizNum } from '../../context/AuthContext.tsx';
import {
  X,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  Building2,
  User as UserIcon,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

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
  defaultBizNum = '999-99-99999',
  defaultEmail = '',
  onSuccessReset,
}) => {
  const {
    requestPasswordReset,
    resetPasswordDirect,
    passwordResetRequests,
  } = useAuth();

  const [mode, setMode] = useState<'REQUEST' | 'RESET_WITH_TEMP'>('REQUEST');

  // Form: Request
  const [bizNum, setBizNum] = useState(defaultBizNum);
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState('');
  const [reqSuccessMsg, setReqSuccessMsg] = useState('');
  const [reqError, setReqError] = useState('');
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  // Form: Reset with Temp Password
  const [tempBizNum, setTempBizNum] = useState(defaultBizNum);
  const [tempEmail, setTempEmail] = useState(defaultEmail);
  const [tempPw, setTempPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetError, setResetError] = useState('');

  // Sync state when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      if (defaultBizNum) {
        setBizNum(defaultBizNum);
        setTempBizNum(defaultBizNum);
      }
      if (defaultEmail) {
        setEmail(defaultEmail);
        setTempEmail(defaultEmail);
      }
      setReqError('');
      setReqSuccessMsg('');
      setResetError('');
      setResetSuccessMsg('');
      setCreatedRequestId(null);
    }
  }, [isOpen, defaultBizNum, defaultEmail]);

  if (!isOpen) return null;

  // Check if there is already an issued temp password for this email (to help the user)
  const existingIssuedRequest = passwordResetRequests.find(
    (r) =>
      r.userEmail.toLowerCase() === (email.trim() || tempEmail.trim()).toLowerCase() &&
      r.status === 'ISSUED' &&
      r.tempPassword
  );

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');
    setReqSuccessMsg('');

    if (!bizNum.trim() || !email.trim() || !name.trim()) {
      setReqError('모든 정보를 정확히 입력해 주세요.');
      return;
    }

    // NOTE: Function signature is requestPasswordReset(businessNumber, email, name)
    const res = requestPasswordReset(bizNum, email, name);
    if (res.success) {
      setCreatedRequestId(res.requestId || null);
      setReqSuccessMsg(
        '비밀번호 재설정 신청이 완료되었습니다! 최고 관리자(admin)가 확인 후 임시 비밀번호를 발급하면, 전달받은 임시 비밀번호로 로그인하거나 [2단계: 임시번호로 새 비밀번호 등록] 탭에서 변경하실 수 있습니다.'
      );
      setTempEmail(email);
      setTempBizNum(bizNum);
    } else {
      setReqError(res.error || '신청 접수에 실패했습니다.');
    }
  };

  const handleResetDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccessMsg('');

    if (!tempBizNum.trim() || !tempEmail.trim() || !tempPw.trim() || !newPw.trim()) {
      setResetError('모든 항목을 입력해 주세요.');
      return;
    }

    if (newPw.length < 4) {
      setResetError('새 비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }

    if (newPw !== confirmNewPw) {
      setResetError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    // NOTE: Function signature is resetPasswordDirect(businessNumber, email, tempPassword, newPassword)
    const res = resetPasswordDirect(tempBizNum, tempEmail, tempPw, newPw);
    if (res.success) {
      setResetSuccessMsg('새 비밀번호가 성공적으로 등록되었습니다! 이제 로그인하실 수 있습니다.');
      if (onSuccessReset) {
        onSuccessReset(tempEmail, tempBizNum);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setResetError(res.error || '비밀번호 재설정에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                비밀번호 찾기 및 재설정
              </h3>
              <p className="text-[11px] text-slate-500">
                관리자(ADMIN) 및 직원(EMPLOYEE) 전용 비밀번호 재발급 포털
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('REQUEST')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'REQUEST'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1단계: 비밀번호 수정 신청
          </button>
          <button
            type="button"
            onClick={() => setMode('RESET_WITH_TEMP')}
            className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'RESET_WITH_TEMP'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2단계: 임시번호로 새 비밀번호 등록
          </button>
        </div>

        {/* MODE 1: REQUEST */}
        {mode === 'REQUEST' && (
          <form onSubmit={handleRequestSubmit} className="space-y-3.5">
            {reqError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reqError}</span>
              </div>
            )}

            {reqSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-950">신청 접수 완료</span>
                    <p className="mt-0.5 leading-relaxed">{reqSuccessMsg}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('RESET_WITH_TEMP')}
                    className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                  >
                    <span>새 비밀번호 등록 탭으로 이동</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {existingIssuedRequest && !reqSuccessMsg && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold block">💡 발급 완료된 임시 비밀번호가 있습니다</span>
                  <span className="text-[11px] text-indigo-700">
                    최고 관리자 승인 임시번호:{' '}
                    <strong className="font-mono bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-bold">
                      {existingIssuedRequest.tempPassword}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempBizNum(existingIssuedRequest.businessNumber);
                    setTempEmail(existingIssuedRequest.userEmail);
                    setTempPw(existingIssuedRequest.tempPassword || '');
                    setMode('RESET_WITH_TEMP');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  바로 변경하기
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                회사 사업자등록번호 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bizNum}
                  onChange={(e) => setBizNum(formatBizNum(e.target.value))}
                  placeholder="999-99-99999"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                가입된 회사 이메일 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@segyotax.com 또는 kim.daeri@segyotax.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                가입자 성명 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 정팀장 또는 김대리"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1 text-slate-800 font-semibold">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>처리 절차 안내</span>
              </div>
              <p>
                1. 신청 버튼 클릭 시 시스템 최고 관리자(admin)의 관제 화면에 실시간 접수됩니다.
                <br />
                2. 최고 관리자가 임시 비밀번호를 발급하면 해당 임시 번호로 로그인하거나 옆 탭에서 신규 비밀번호를 직접 설정할 수 있습니다.
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
                id="btn-submit-pw-request"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                비밀번호 수정 신청하기
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: RESET WITH TEMP */}
        {mode === 'RESET_WITH_TEMP' && (
          <form onSubmit={handleResetDirectSubmit} className="space-y-3.5">
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  사업자등록번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tempBizNum}
                  onChange={(e) => setTempBizNum(formatBizNum(e.target.value))}
                  placeholder="999-99-99999"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  이메일 주소 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                부여받은 임시 비밀번호 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tempPw}
                  onChange={(e) => setTempPw(e.target.value)}
                  placeholder="최고관리자가 발급한 임시번호 입력"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  새 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="최소 4자리 이상"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  새 비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmNewPw}
                  onChange={(e) => setConfirmNewPw(e.target.value)}
                  placeholder="동일하게 다시 입력"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                닫기
              </button>
              <button
                type="submit"
                id="btn-submit-direct-reset"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                새 비밀번호 저장 및 즉시 변경
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
