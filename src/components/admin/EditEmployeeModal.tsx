import React, { useState, useEffect } from 'react';
import { User, UserRole, AccountStatus } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  X,
  Briefcase,
  Calendar,
  AlertCircle,
  Building2,
  ShieldCheck,
  Crown,
  PowerOff,
  UserCheck,
} from 'lucide-react';

interface EditEmployeeModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateEmployee, updateUserRole, toggleUserStatus, currentUser } = useAuth();

  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [status, setStatus] = useState<AccountStatus>('APPROVED');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setPosition(user.position || '사원');
      setDepartment(user.department || '일반부서');
      setCompanyName(user.companyName || '');
      setJoinedDate(user.joinedDate || new Date().toISOString().split('T')[0]);
      setRole(user.role || 'EMPLOYEE');
      setStatus(user.status || 'APPROVED');
      setErrorMsg('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isCurrentUserTarget = user.id === currentUser?.id;
  const isMasterAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isTargetSuperAdmin = user.role === 'SUPER_ADMIN' || user.email === 'admin@segyotax.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!position.trim()) {
      setErrorMsg('직급을 입력해 주세요.');
      return;
    }
    if (!joinedDate.trim()) {
      setErrorMsg('입사일자를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);

    const res = updateEmployee(user.id, {
      position: position.trim(),
      department: department.trim(),
      companyName: companyName.trim(),
      joinedDate: joinedDate.trim(),
    });

    // Only master admins can update roles and status from this modal
    if (isMasterAdmin) {
      if (role !== user.role) {
        updateUserRole(user.id, role);
      }

      if (status !== user.status) {
        const statusRes = toggleUserStatus(user.id, status);
        if (!statusRes.success) {
          setErrorMsg(statusRes.error || '계정 상태 변경에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || '계정 정보 수정에 실패했습니다.');
    } else {
      if (isMasterAdmin) {
        onSuccess?.(`${user.name} 계정의 정보, 권한 및 상태가 정상 수정되었습니다. (감사 이력 자동 기록됨)`);
      } else {
        onSuccess?.(`${user.name} 계정의 인사 정보가 정상 수정되었습니다. (감사 이력 자동 기록됨)`);
      }
      onClose();
    }
  };

  const presetPositions = ['admin', '팀장', '부장', '차장', '과장', '대리', '주임', '사원', '선임연구원', '수석연구원'];
  const presetDepartments = ['최고관리실', '경영지원본부', '개발본부', '디자인팀', '마케팅팀', '데이터전략팀'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-edit-employee"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{isMasterAdmin ? '계정 통합 정보 & 권한 제어' : '계정 정보 수정'}</span>
              {user.role === 'SUPER_ADMIN' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  SUPER_ADMIN
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {user.name} ({user.email}) · {isMasterAdmin ? `사업자: ${user.businessNumber}` : '인사 정보 수정'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Company Name field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>회사명 (상호)</span>
              {isTargetSuperAdmin && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  admin 고정
                </span>
              )}
            </label>
            <input
              id="input-edit-emp-company"
              type="text"
              value={isTargetSuperAdmin ? 'admin' : companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isTargetSuperAdmin}
              placeholder="예: 가나다 주식회사"
              className={`w-full px-3 py-2 text-xs rounded-lg border font-medium ${
                isTargetSuperAdmin
                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                  : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {isTargetSuperAdmin
                ? '마스터 최고관리자(admin) 계정은 회사명이 admin으로 고정되어 변경할 수 없습니다.'
                : '사업장 전체 계정의 회사명을 일괄 갱신하려면 상단의 [회사명(상호) 관리] 기능을 이용하실 수 있습니다.'}
            </p>
          </div>

          {/* Department field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>소속 부서 / 팀</span>
            </label>
            <input
              id="input-edit-emp-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="예: 경영지원본부, 플랫폼개발팀"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {presetDepartments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartment(dept)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    department === dept
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Position field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>직급 (Position) <strong className="text-rose-500">*</strong></span>
            </label>
            <input
              id="input-edit-emp-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="예: admin, 팀장, 사원"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {presetPositions.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPosition(pos)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                    position === pos
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Role selection field - only visible for master admins */}
          {isMasterAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>부여 권한 (User Role)</span>
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
                      name="edit-role"
                      value="EMPLOYEE"
                      checked={role === 'EMPLOYEE'}
                      onChange={() => setRole('EMPLOYEE')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-xs">직원 (EMPLOYEE)</span>
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
                      name="edit-role"
                      value="ADMIN"
                      checked={role === 'ADMIN'}
                      onChange={() => setRole('ADMIN')}
                      className="text-purple-600"
                    />
                    <span className="font-bold text-xs">관리자 (ADMIN)</span>
                  </div>
                  <span className="text-[10px] text-purple-600 mt-1">휴가 승인 & 직원 관리</span>
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
                      name="edit-role"
                      value="SUPER_ADMIN"
                      checked={role === 'SUPER_ADMIN'}
                      onChange={() => setRole('SUPER_ADMIN')}
                      className="text-amber-600"
                    />
                    <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold text-xs">최고관리자 (SUPER)</span>
                  </div>
                  <span className="text-[10px] text-amber-700 mt-1">전체 계정 & 이력 전권</span>
                </label>
              </div>
              {isCurrentUserTarget && role !== user.role && (
                <p className="text-[10px] text-amber-600 mt-1 font-medium">
                  * 현재 로그인된 본인 계정의 권한을 변경할 경우 관리자 권한이 즉시 변동됩니다.
                </p>
              )}
            </div>
          )}

          {/* Status field - only visible for master admins */}
          {isMasterAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <PowerOff className="w-3.5 h-3.5 text-slate-600" />
                <span>계정 이용 상태 (Account Status)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    status === 'APPROVED'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit-status"
                    value="APPROVED"
                    checked={status === 'APPROVED'}
                    onChange={() => setStatus('APPROVED')}
                    className="text-emerald-600"
                  />
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="block text-xs font-bold">정상 활성 (Active)</span>
                    <span className="block text-[10px] text-slate-400">정상 로그인 및 서비스 이용</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    status === 'INACTIVE'
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold ring-1 ring-rose-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit-status"
                    value="INACTIVE"
                    checked={status === 'INACTIVE'}
                    onChange={() => setStatus('INACTIVE')}
                    disabled={isCurrentUserTarget}
                    className="text-rose-600"
                  />
                  <PowerOff className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="block text-xs font-bold">이용 정지 (Inactive)</span>
                    <span className="block text-[10px] text-slate-400">로그인 차단 및 비활성화</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Joined Date field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>입사일자 (Joined Date) <strong className="text-rose-500">*</strong></span>
            </label>
            <input
              id="input-edit-emp-joineddate"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              수정된 내용은 계정 이력(Audit Log)에 정확한 시각 및 Before/After 변경 내역으로 기록됩니다.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
            >
              취소
            </button>
            <button
              id="btn-save-employee-edit"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors shadow-xs"
            >
              {isSubmitting ? '저장 중...' : '변경사항 저장 (감사기록 반영)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
