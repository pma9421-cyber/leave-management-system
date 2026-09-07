import React, { useState } from 'react';
import { useAuth, formatBizNum } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types.ts';
import { ForgotPasswordModal } from './ForgotPasswordModal.tsx';
import {
  CalendarDays,
  ShieldCheck,
  User as UserIcon,
  Lock,
  Mail,
  Building2,
  Briefcase,
  CheckCircle2,
  Info,
  Clock,
  KeyRound,
  Crown,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login form state (Empty State by default)
  const [loginBizNum, setLoginBizNum] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pendingNotice, setPendingNotice] = useState('');

  // Register form state (Empty State by default)
  const [regBizNum, setRegBizNum] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPosition, setRegPosition] = useState('사원');
  const [regRole, setRegRole] = useState<UserRole>('EMPLOYEE');
  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setPendingNotice('');

    if (!loginBizNum.trim()) {
      setLoginError('회사 사업자등록번호를 입력해 주세요.');
      return;
    }
    if (!loginEmail.trim()) {
      setLoginError('이메일을 입력해 주세요.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('비밀번호를 입력해 주세요.');
      return;
    }

    const res = await login(loginEmail, loginPassword, loginBizNum);
    if (!res.success) {
      setLoginError(res.error || '로그인에 실패했습니다.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');

    if (!regBizNum.trim()) {
      setRegError('회사 사업자등록번호를 입력해 주세요.');
      return;
    }
    if (regRole === 'ADMIN' && !regCompanyName.trim()) {
      setRegError('관리자 계정 가입 시 회사명(상호)을 반드시 기재해 주세요.');
      return;
    }
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('모든 필수 항목을 입력해 주세요.');
      return;
    }
    if (regPassword.trim().length < 6) {
      setRegError('비밀번호는 최소 6자리 이상으로 입력해 주세요.');
      return;
    }

    const res = await register({
      name: regName.trim(),
      email: regEmail.trim(),
      businessNumber: regBizNum.trim(),
      companyName: regRole === 'ADMIN' ? regCompanyName.trim() : undefined,
      position: regPosition.trim(),
      role: regRole,
      totalLeaveDays: regRole === 'ADMIN' ? 20 : 15,
      password: regPassword.trim(),
    });

    if (!res.success) {
      setRegError(res.error || '회원가입에 실패했습니다.');
    } else {
      if (res.isPending) {
        setRegSuccessMsg(
          '직원 계정 가입 신청이 완료되었습니다. 이메일 인증 후 회사 관리자의 승인을 받으면 로그인할 수 있습니다.'
        );
        setIsLoginMode(true);
        setLoginEmail(regEmail.trim());
        setLoginBizNum(regBizNum.trim());
        setLoginPassword('');
      } else {
        setRegSuccessMsg('관리자 계정 가입이 완료되었습니다. 이메일 인증 후 바로 로그인할 수 있습니다.');
        setIsLoginMode(true);
        setLoginEmail(regEmail.trim());
        setLoginBizNum(regBizNum.trim());
        setLoginPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-4">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          연차 및 휴가 관리 시스템
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          사업자번호 기반 회사 연동 · 직원 계정 승인 및 근태 관리 포털
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200">
          {/* Switch tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              id="tab-login-mode"
              onClick={() => {
                setIsLoginMode(true);
                setLoginError('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                isLoginMode
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              로그인 (Sign In)
            </button>
            <button
              id="tab-register-mode"
              onClick={() => {
                setIsLoginMode(false);
                setRegError('');
                setRegSuccessMsg('');
              }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                !isLoginMode
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              신규 등록 (Sign Up)
            </button>
          </div>

          {regSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">신규 가입 신청 완료</span>
                <span>{regSuccessMsg}</span>
              </div>
            </div>
          )}

          {isLoginMode ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Company Business Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  회사 사업자등록번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-login-biznum"
                    type="text"
                    value={loginBizNum}
                    onChange={(e) => setLoginBizNum(formatBizNum(e.target.value))}
                    placeholder="123-45-67890"
                    maxLength={12}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  동일한 사업자번호로 등록된 관리자 및 직원 계정이 상호 연동됩니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  이메일 주소 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    비밀번호 <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    id="btn-forgot-password-link"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>비밀번호 찾기</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호를 입력해 주세요"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showLoginPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                로그인
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  id="btn-forgot-password-bottom"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium cursor-pointer"
                >
                  비밀번호를 분실하셨나요? (관리자/직원 임시번호 발급 신청)
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {regError}
                </div>
              )}

              {/* Business Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  회사 사업자등록번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-reg-biznum"
                    type="text"
                    value={regBizNum}
                    onChange={(e) => setRegBizNum(formatBizNum(e.target.value))}
                    placeholder="123-45-67890"
                    maxLength={12}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  같은 사업자번호를 기재한 관리자와 직원 계정이 연동됩니다.
                </p>
              </div>

              {/* Account Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  계정 유형 (Role)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      regRole === 'EMPLOYEE'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="role"
                        value="EMPLOYEE"
                        checked={regRole === 'EMPLOYEE'}
                        onChange={() => setRegRole('EMPLOYEE')}
                        className="sr-only"
                      />
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">일반 직원 (Employee)</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-normal mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      관리자 승인 후 이용 가능
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      regRole === 'ADMIN'
                        ? 'border-purple-500 bg-purple-50/60 text-purple-900 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="role"
                        value="ADMIN"
                        checked={regRole === 'ADMIN'}
                        onChange={() => setRegRole('ADMIN')}
                        className="sr-only"
                      />
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span className="text-xs">관리자 (Admin)</span>
                    </div>
                    <span className="text-[10px] text-purple-600 font-normal mt-1">
                      즉시 활성화 및 승인 권한
                    </span>
                  </label>
                </div>
              </div>

              {/* Company Name (Admin only - Hidden/deleted for Employee) */}
              {regRole === 'ADMIN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    회사명 (상호) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-reg-company-name"
                      type="text"
                      value={regCompanyName}
                      onChange={(e) => setRegCompanyName(e.target.value)}
                      placeholder="예: 가나다 주식회사"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    관리자 계정 등록 시 해당 사업장의 공식 상호명으로 등록됩니다.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  성명 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-reg-name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  회사 이메일 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  비밀번호 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="최소 4자리 이상 입력"
                    minLength={4}
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showRegPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  로그인 시 사용할 안전한 비밀번호(최소 4자리 이상)를 입력해 주세요.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  직급
                </label>
                <input
                  type="text"
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  placeholder="사원, 주임, 대리, 과장 등"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                {regRole === 'EMPLOYEE' ? '가입 신청 (관리자 승인 대기)' : '관리자 가입 완료'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultBizNum={loginBizNum}
        defaultEmail={loginEmail}
        onSuccessReset={(email, bizNum) => {
          setLoginEmail(email);
          setLoginBizNum(bizNum);
          setLoginPassword('');
        }}
      />
    </div>
  );
};
