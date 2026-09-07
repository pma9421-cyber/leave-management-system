import React, { useEffect, useState } from 'react';
import { useAuth, formatBizNum } from '../../context/AuthContext.tsx';
import {
  X,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  User as UserIcon,
  Lock,
  Info,
  Eye,
  EyeOff,
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
  defaultBizNum = '',
  defaultEmail = '',
  onSuccessReset,
}) => {
  const { requestPasswordReset, resetPasswordDirect } = useAuth();
  const [step, setStep] = useState<'REQUEST' | 'CHANGE'>('REQUEST');
  const [bizNum, setBizNum] = useState(defaultBizNum);
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTemp, setShowTemp] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBizNum(defaultBizNum || '');
    setEmail(defaultEmail || '');
    setName('');
    setTempPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setStep('REQUEST');
  }, [isOpen, defaultBizNum, defaultEmail]);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!bizNum.trim() || !email.trim() || !name.trim()) {
      setError('사업자등록번호, 가입 이메일, 성명을 모두 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestPasswordReset(bizNum, email, name);
      if (!res.success) {
        setError(res.error || '비밀번호 재설정 신청에 실패했습니다.');
        return;
      }
      setSuccess(
        res.error ||
          '관리자 계정으로 비밀번호 재설정 신청이 접수되었습니다. 관리자가 임시 비밀번호를 발급하면 아래 2단계에서 새 비밀번호로 변경해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!bizNum.trim() || !email.trim() || !tempPassword.trim() || !newPassword.trim()) {
      setError('사업자등록번호, 이메일, 임시 비밀번호, 새 비밀번호를 모두 입력해 주세요.');
      return;
    }
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
      const res = await resetPasswordDirect(bizNum, email, tempPassword, newPassword);
      if (!res.success) {
        setError(res.error || '새 비밀번호 변경에 실패했습니다.');
        return;
      }
      setSuccess('비밀번호 변경이 완료되었습니다. 이제 새 비밀번호로 로그인해 주세요.');
      onSuccessReset?.(email.trim(), formatBizNum(bizNum));
      setTempPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">비밀번호 찾기 및 재설정</h3>
              <p className="text-[11px] text-slate-500">관리자 임시 비밀번호 발급 방식</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                setStep('REQUEST');
                setError('');
                setSuccess('');
              }}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                step === 'REQUEST' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              1단계: 재설정 신청
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('CHANGE');
                setError('');
                setSuccess('');
              }}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                step === 'CHANGE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              2단계: 새 비밀번호 등록
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-2 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  신청 내용은 회사 관리자 화면의 <strong>비밀번호 재설정 신청</strong> 메뉴로 전달됩니다.
                  이메일은 발송하지 않습니다.
                </span>
              </div>

              <FieldLabel label="회사 사업자등록번호">
                <Building2 className="field-icon" />
                <input
                  value={bizNum}
                  onChange={(e) => setBizNum(formatBizNum(e.target.value))}
                  maxLength={12}
                  placeholder="123-45-67890"
                  className="field-input"
                />
              </FieldLabel>
              <FieldLabel label="가입된 회사 이메일">
                <Mail className="field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="field-input"
                />
              </FieldLabel>
              <FieldLabel label="가입자 성명">
                <UserIcon className="field-icon" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className="field-input" />
              </FieldLabel>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
              >
                {loading ? '신청 중...' : '관리자에게 비밀번호 재설정 신청'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleChange} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-2 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  관리자에게 전달받은 <strong>임시 비밀번호</strong>를 입력한 뒤 본인이 사용할 새 비밀번호를 등록하세요.
                </span>
              </div>

              <FieldLabel label="회사 사업자등록번호">
                <Building2 className="field-icon" />
                <input
                  value={bizNum}
                  onChange={(e) => setBizNum(formatBizNum(e.target.value))}
                  maxLength={12}
                  placeholder="123-45-67890"
                  className="field-input"
                />
              </FieldLabel>
              <FieldLabel label="가입된 이메일">
                <Mail className="field-icon" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
              </FieldLabel>
              <FieldLabel label="관리자에게 받은 임시 비밀번호">
                <Lock className="field-icon" />
                <input
                  type={showTemp ? 'text' : 'password'}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="field-input pr-10"
                />
                <EyeButton show={showTemp} onClick={() => setShowTemp((v) => !v)} />
              </FieldLabel>
              <FieldLabel label="새 비밀번호">
                <Lock className="field-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6자리 이상"
                  className="field-input pr-10"
                />
                <EyeButton show={showNew} onClick={() => setShowNew((v) => !v)} />
              </FieldLabel>
              <FieldLabel label="새 비밀번호 확인">
                <Lock className="field-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field-input"
                />
              </FieldLabel>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
              >
                {loading ? '변경 중...' : '임시 비밀번호 확인 후 새 비밀번호 저장'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .field-icon { position:absolute; left:12px; top:12px; width:16px; height:16px; color:#94a3b8; }
        .field-input { width:100%; padding:9px 12px 9px 36px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; outline:none; }
        .field-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.12); }
      `}</style>
    </div>
  );
};

const FieldLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold text-slate-700 mb-1">{label} <span className="text-rose-500">*</span></span>
    <div className="relative">{children}</div>
  </label>
);

const EyeButton: React.FC<{ show: boolean; onClick: () => void }> = ({ show, onClick }) => (
  <button type="button" onClick={onClick} className="absolute right-3 top-2.5 p-1 text-slate-400 cursor-pointer">
    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </button>
);
