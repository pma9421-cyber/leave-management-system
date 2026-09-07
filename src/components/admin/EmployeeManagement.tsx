import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { User } from '../../types.ts';
import { EditEmployeeModal } from './EditEmployeeModal.tsx';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  Search,
  CheckCircle2,
  Calendar,
  Briefcase,
  Edit2,
  ShieldCheck,
  Crown,
  Trash2,
} from 'lucide-react';

export const EmployeeManagement: React.FC = () => {
  const {
    currentUser,
    companyUsers,
    approveUser,
    rejectUser,
    deleteUser,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [successToast, setSuccessToast] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Group into pending and approved/active
  const pendingEmployees = companyUsers.filter(
    (u) => u.role === 'EMPLOYEE' && u.status === 'PENDING'
  );

  const nonPendingUsers = companyUsers.filter(
    (u) => u.status !== 'PENDING'
  );

  // Filtered users
  const filteredUsers = nonPendingUsers.filter((u) => {
    // Role filter
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

    // Search term
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.position.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  const handleApprove = async (userId: string, name: string) => {
    const res = await approveUser(userId);
    if (res.success) {
      showToast(`${name} 직원의 계정이 승인되었습니다. 이제 해당 직원이 로그인할 수 있습니다.`);
    } else {
      showToast(res.message || '가입 승인 처리에 실패했습니다.');
    }
  };

  const handleReject = async (userId: string, name: string) => {
    if (window.confirm(`${name} 직원의 가입 신청을 반려하시겠습니까?`)) {
      const res = await rejectUser(userId);
      if (res.success) {
        showToast(`${name} 직원의 가입 신청이 반려되었습니다.`);
      } else {
        showToast(res.message || '가입 반려 처리에 실패했습니다.');
      }
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('현재 로그인 중인 본인 계정은 삭제할 수 없습니다.');
      return;
    }
    setUserToDelete(user);
  };

  const isCurrentSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast message */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Company Info & Master Admin Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </span>
            <h1 className="text-lg font-bold text-slate-900">전체 계정 제어 및 직원 관리</h1>
            {isCurrentSuperAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-700" />
                마스터 전권 모드
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            신규 계정 생성, 인사 정보 수정 및 계정 삭제를 통합 제어합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Company Name Badge */}
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-400 block text-[10px]">회사명 (상호)</span>
            <span className="font-bold text-slate-800">
              {currentUser?.companyName || '회사'}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="text-slate-400 block text-[10px]">사업장 사업자번호</span>
            <span className="font-bold text-slate-800 font-mono">
              {currentUser?.businessNumber || '999-99-99999'}
            </span>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-center">
            <span className="text-blue-500 block text-[10px]">전체 등록 계정</span>
            <span className="font-bold text-blue-700">{companyUsers.length}명</span>
          </div>
        </div>
      </div>

      {/* 1. Pending Employee Approvals Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              신규 직원 가입 승인 대기 ({pendingEmployees.length}건)
            </h2>
          </div>
          {pendingEmployees.length > 0 && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              관리자 승인 필요
            </span>
          )}
        </div>

        {pendingEmployees.length === 0 ? (
          <div className="text-center py-5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="font-medium text-slate-600">가입 승인 대기 중인 직원이 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              사용자가 동일 사업자번호로 회원가입 시 실시간으로 대기 목록에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingEmployees.map((emp) => (
              <div
                key={emp.id}
                id={`pending-card-${emp.id}`}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:border-amber-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        {emp.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {emp.position || '사원'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">{emp.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                      승인대기
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-white/70 p-2.5 rounded-lg border border-amber-100 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">입사일자:</span>
                      <span className="font-medium text-slate-800">{emp.joinedDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">사업자번호:</span>
                      <span className="font-mono text-slate-700">{emp.businessNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Approve & Reject actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-amber-100">
                  <button
                    id={`btn-approve-${emp.id}`}
                    onClick={() => handleApprove(emp.id, emp.name)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>가입 승인</span>
                  </button>
                  <button
                    id={`btn-reject-${emp.id}`}
                    onClick={() => handleReject(emp.id, emp.name)}
                    className="py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>반려</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Registered Employees Roster & Unified Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>전체 계정 통합 명부 및 제어 ({filteredUsers.length}명)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              각 계정의 권한 변경, 인사 정보 수정, 계정 삭제 및 활성화/비활성화를 실시간으로 수행합니다.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 text-[11px]">권한:</span>
              <select
                id="select-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 권한</option>
                <option value="SUPER_ADMIN">최고관리자 (SUPER)</option>
                <option value="ADMIN">관리자 (ADMIN)</option>
                <option value="EMPLOYEE">직원 (EMPLOYEE)</option>
              </select>
            </div>

            {/* Search bar */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-search-employees"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름, 이메일, 직급..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Table / List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                <th className="px-3 py-2.5 font-semibold">계정 / 성명</th>
                <th className="px-3 py-2.5 font-semibold">부서 / 직급</th>
                <th className="px-3 py-2.5 font-semibold">권한 등급</th>
                <th className="px-3 py-2.5 font-semibold">입사일자</th>
                <th className="px-3 py-2.5 font-semibold">연차 현황</th>
                <th className="px-3 py-2.5 font-semibold text-right">계정 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-xs">
                    조건에 해당하는 계정이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentSuper = user.role === 'SUPER_ADMIN';
                  const isCurrentAdmin = user.role === 'ADMIN';
                  const remaining = Number((user.totalLeaveDays - user.usedLeaveDays).toFixed(1));
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      id={`row-employee-${user.id}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCurrentSuper
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                : isCurrentAdmin
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {user.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold">
                                  본인
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-normal font-mono">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department & Position */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {user.position || '사원'}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {user.department || '일반부서'}
                          </span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-3 py-3">
                        {isCurrentSuper ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <Crown className="w-3 h-3 text-amber-700" />
                            SUPER_ADMIN
                          </span>
                        ) : isCurrentAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            EMPLOYEE
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-3 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {user.joinedDate || '2024-01-01'}
                        </span>
                      </td>

                      {/* Leave Quota */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-blue-700">{remaining}일</span>
                        <span className="text-slate-400 font-normal"> / {user.totalLeaveDays}일</span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit info */}
                          <button
                            id={`btn-edit-employee-${user.id}`}
                            onClick={() => setEditingUser(user)}
                            title="인사정보 수정"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold cursor-pointer transition-colors shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>수정</span>
                          </button>

                          {/* Delete Account */}
                          <button
                            id={`btn-delete-employee-${user.id}`}
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? '본인 계정은 삭제할 수 없습니다.'
                                : '계정 영구 삭제 (감사 이력은 보존됨)'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingUser && (
        <EditEmployeeModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div
          id="modal-confirm-delete-employee"
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">직원 계정 삭제 확인</h3>
                <p className="text-xs text-slate-500 mt-1">
                  선택하신 직원을 시스템 명부에서 삭제하시겠습니까?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">성명:</span>
                <span className="font-bold text-slate-900">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">이메일:</span>
                <span className="font-mono text-slate-800">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">부서 / 직급:</span>
                <span className="text-slate-800">{userToDelete.department || '-'} / {userToDelete.position || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">권한:</span>
                <span className="font-bold text-slate-900">{userToDelete.role}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              * 계정 삭제 시 명부에서 즉시 제외되며 로그인이 불가능합니다. 과거 이력은 감사 로그에 안전하게 보존됩니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deleteUser(userToDelete.id);
                  if (res.success) {
                    showToast(`[${userToDelete.name}] 계정이 안전하게 삭제되었습니다.`);
                    setUserToDelete(null);
                  } else {
                    showToast(res.error || '삭제 실패');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>영구 삭제</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
