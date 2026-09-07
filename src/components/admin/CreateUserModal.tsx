import React, { useState } from 'react';
import { UserRole, AccountStatus } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  UserPlus,
  Mail,
  User as UserIcon,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Crown,
  PowerOff,
  UserCheck,
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createUser, currentUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessNumber, setBusinessNumber] = useState(
    currentUser?.businessNumber || '999-99-99999'
  );
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');
  const [department, setDepartment] = useState('경영지원본부');
  const [position, setPosition] = useState('사원');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [joinedDate, setJoinedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [totalLeaveDays, setTotalLeaveDays] = useState<number>(15);
  const [status, setStatus] = useState<AccountStatus>('APPROVED');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('성명을 입력해 주세요.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('유효한 이메일 주소를 입력해 주세요.');
      return;
    }
    if (!businessNumber.trim()) {
      setErrorMsg('사업자등록번호를 입력해 주세요.');
      return;
    }
    if (!position.trim()) {
      setErrorMsg('직급을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    const res = createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      businessNumber: businessNumber.trim(),
      companyName: companyName.trim(),
      department: department.trim() || '일반부서',
      position: position.trim(),
      role,
      joinedDate: joinedDate.trim(),
      totalLeaveDays: Number(totalLeaveDays) || 15,
      status,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '계정 생성에 실패했습니다.');
    } else {
      onSuccess?.(`[${role}] ${name} (${email}) 계정이 성공적으로 등록되었습니다. (감사 이력 기록 완료)`);
      onClose();
    }
  };

  const presetPositions = ['admin', '팀장', '부장', '차장', '과장', '대리', '주임', '사원'];
  const presetDepartments = ['최고관리실', '경영지원본부', '개발본부', '디자인팀', '마케팅팀', '데이터전략팀'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-create-user"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">신규 사용자/관리자 계정 직접 생성</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                최고 관리자 권한으로 시스템에 즉시 등록 및 권한을 부여합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>성명 (Name) <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                id="input-create-user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>회사 이메일 (Email) <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                id="input-create-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@segyotax.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
                required
              />
            </div>
          </div>

          {/* Business Number & Company Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>사업자등록번호 <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                id="input-create-user-business-num"
                type="text"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="999-99-99999"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>회사명 (상호)</span>
              </label>
              <input
                id="input-create-user-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 가나다 주식회사"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Joined Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>입사일자 (Joined Date) <strong className="text-rose-500">*</strong></span>
            </label>
            <input
              id="input-create-user-joineddate"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          {/* Department & Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>소속 부서/팀</span>
              </label>
              <input
                id="input-create-user-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 경영지원본부"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {presetDepartments.slice(0, 4).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepartment(d)}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>직급 (Position) <strong className="text-rose-500">*</strong></span>
              </label>
              <input
                id="input-create-user-pos"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="예: 사원, 과장, 팀장"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {presetPositions.slice(0, 5).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>부여 권한 등급 (Role)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                  role === 'EMPLOYEE'
                    ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold ring-1 ring-blue-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="create-role"
                    value="EMPLOYEE"
                    checked={role === 'EMPLOYEE'}
                    onChange={() => setRole('EMPLOYEE')}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-xs">일반 직원</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">휴가 신청 및 본인 내역</span>
              </label>

              <label
                className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                  role === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50/60 text-purple-900 font-semibold ring-1 ring-purple-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="create-role"
                    value="ADMIN"
                    checked={role === 'ADMIN'}
                    onChange={() => setRole('ADMIN')}
                    className="text-purple-600"
                  />
                  <span className="font-bold text-xs">관리자 (ADMIN)</span>
                </div>
                <span className="text-[10px] text-purple-600 mt-1">승인 및 직원 관리</span>
              </label>

              <label
                className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                  role === 'SUPER_ADMIN'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-semibold ring-1 ring-amber-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="create-role"
                    value="SUPER_ADMIN"
                    checked={role === 'SUPER_ADMIN'}
                    onChange={() => setRole('SUPER_ADMIN')}
                    className="text-amber-600"
                  />
                  <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-xs">최고관리자 (SUPER)</span>
                </div>
                <span className="text-[10px] text-amber-700 mt-1">전체 권한 및 감사 일체</span>
              </label>
            </div>
          </div>

          {/* Initial Quota & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                기본 부여 연차 (일수)
              </label>
              <input
                id="input-create-user-quota"
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={totalLeaveDays}
                onChange={(e) => setTotalLeaveDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                초기 계정 상태
              </label>
              <select
                id="select-create-user-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
              >
                <option value="APPROVED">정상 활성 (즉시 로그인 가능)</option>
                <option value="INACTIVE">비활성화 (로그인 차단)</option>
                <option value="PENDING">승인 대기</option>
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-submit-create-user"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '생성 중...' : '계정 생성 및 감사이력 기록'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
