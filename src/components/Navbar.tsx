import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLeave } from '../context/LeaveContext.tsx';
import { isSuperAdmin, isCompanyAdmin } from '../types.ts';
import {
  CalendarDays,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Users,
  Clock,
  Settings,
  Calendar,
  Crown,
  FileSpreadsheet,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewRequestModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewRequestModal,
}) => {
  const { currentUser, logout, companyUsers, passwordResetRequests } = useAuth();
  const { leaveRequests, workYear, setWorkYear } = useLeave();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const pendingRequestsCount = leaveRequests.filter((r) => r.status === 'PENDING').length;
  const pendingEmployeesCount = companyUsers.filter((u) => u.role === 'EMPLOYEE' && u.status === 'PENDING').length;
  const pendingPasswordResetsCount = passwordResetRequests.filter((r) => r.status === 'PENDING').length;

  if (!currentUser) return null;

  const isMaster = isSuperAdmin(currentUser.role);
  const isRegularAdmin = isCompanyAdmin(currentUser.role);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`w-9 h-9 rounded-lg text-white flex items-center justify-center shadow-xs ${
                isMaster ? 'bg-amber-600' : 'bg-blue-600'
              }`}
            >
              {isMaster ? <Crown className="w-5 h-5 text-amber-100" /> : <CalendarDays className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-tight">
                {isMaster ? '마스터 관리자 시스템' : '연차휴가 ON'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                {isMaster ? '계정 이력 및 시스템 통합 관제' : '근태 및 휴가 관리 포털'}
              </span>
            </div>
          </div>

          {/* Right Action Area */}
          <div className="user-profile gap-2 sm:gap-3">
            {/* Quick action button: ONLY for regular admin and employees. NOT for Super Admin! */}
            {!isMaster && (
              <button
                id="btn-quick-leave-request"
                onClick={onOpenNewRequestModal}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>휴가 신청하기</span>
              </button>
            )}

            {/* Admin Work Year Filter: For regular company admin and master admin */}
            {(isRegularAdmin || isMaster) && (
              <div
                id="admin-work-year-filter"
                className="user-profile gap-1.5 px-2.5 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors shrink-0"
                title="관리자 작업년도 선택"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-600 font-semibold text-[11px] hidden sm:inline">작업년도</span>
                <select
                  id="select-admin-work-year"
                  value={workYear}
                  onChange={(e) => setWorkYear(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer pr-0.5"
                >
                  {[2023, 2024, 2025, 2026, 2027, 2028].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}년
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Current User Pill & Dropdown */}
            <div ref={userMenuRef} className="dropdown-container user-profile relative shrink-0">
              <button
                id="btn-user-profile-menu"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                }}
                className="user-profile gap-2 px-2 sm:px-2.5 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isMaster
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                      : isRegularAdmin
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="hidden sm:block text-left max-w-[130px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ellipsis text-xs font-semibold text-slate-800 leading-none">
                      {currentUser.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        isMaster
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                          : isRegularAdmin
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isMaster ? '최고관리자' : isRegularAdmin ? '관리자' : '직원'}
                    </span>
                  </div>
                  <span className="text-ellipsis text-[10px] text-slate-500 block leading-none mt-0.5">
                    {currentUser.position}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {showUserMenu && (
                <div
                  id="user-profile-dropdown"
                  className="dropdown-menu absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-[1000] animate-in fade-in zoom-in-95 duration-100"
                  style={{ top: 'calc(100% + 8px)', bottom: 'auto', right: 0, zIndex: 1000 }}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-ellipsis text-xs font-semibold text-slate-900">{currentUser.name}</p>
                    <p className="text-ellipsis text-[11px] text-slate-500">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-ellipsis max-w-[180px] text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {currentUser.position}
                      </span>
                      {currentUser.companyName && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-semibold">
                          {currentUser.companyName}
                        </span>
                      )}
                      {isMaster && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          시스템 총괄
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Leave stats: ONLY shown for regular admin & employee. Hidden for SUPER_ADMIN */}
                  {!isMaster && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[11px] text-slate-500 flex justify-between">
                        <span>잔여 연차:</span>
                        <span className="font-semibold text-blue-600">
                          {(currentUser.totalLeaveDays - currentUser.usedLeaveDays).toFixed(1)} /{' '}
                          {currentUser.totalLeaveDays}일
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      id="btn-logout"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Row */}
        <div className="hidden md:block border-t border-slate-100 py-2.5">
          <nav className="nav-container">
            {isMaster ? (
              /* SUPER_ADMIN: ONLY [계정이력관리] (계정 및 이력 통합 관리 포털) */
              <div className="flex items-center gap-3">
                <button
                  id="nav-superadmin-audit"
                  onClick={() => setActiveTab('admin-audit-logs')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    activeTab === 'admin-audit-logs'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>계정 이력 및 통합 관리</span>
                  {pendingPasswordResetsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-xs font-bold leading-none bg-rose-600 text-white rounded-full animate-bounce">
                      비밀번호 요청 {pendingPasswordResetsCount}
                    </span>
                  )}
                </button>
                <span className="text-xs text-slate-400 font-medium pl-2">
                  (전체 사업자번호 대상 계정 제어, 비밀번호 발급, 이력 조회, 관리자 계정 한도 설정)
                </span>
              </div>
            ) : isRegularAdmin ? (
              /* ADMIN (일반 관리자): [계정이력관리] 삭제됨! */
              <div className="nav-container-grid w-full">
                <button
                  id="nav-admin-dashboard"
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>전체 대시보드</span>
                </button>
                <button
                  id="nav-admin-approvals"
                  onClick={() => setActiveTab('admin-approvals')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'admin-approvals'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>휴가 승인 관리</span>
                  {pendingRequestsCount > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  id="nav-admin-employees"
                  onClick={() => setActiveTab('admin-employees')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'admin-employees'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>직원관리</span>
                  {pendingEmployeesCount > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full animate-pulse">
                      {pendingEmployeesCount}
                    </span>
                  )}
                </button>
                <button
                  id="nav-admin-quotas"
                  onClick={() => setActiveTab('admin-quotas')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'admin-quotas'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>직원 연차 관리</span>
                </button>
                <button
                  id="nav-admin-types"
                  onClick={() => setActiveTab('admin-types')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'admin-types'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>휴가 유형 설정</span>
                </button>
                <button
                  id="nav-my-leaves"
                  onClick={() => setActiveTab('employee-dashboard')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'employee-dashboard'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>내 연차 보기</span>
                </button>
                <button
                  id="nav-admin-my-history"
                  onClick={() => setActiveTab('employee-history')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'employee-history'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>신청 내역 조회</span>
                </button>
              </div>
            ) : (
              /* EMPLOYEE */
              <div className="flex items-center gap-2 max-w-md">
                <button
                  id="nav-emp-dashboard"
                  onClick={() => setActiveTab('employee-dashboard')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'employee-dashboard'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>내 연차 대시보드</span>
                </button>
                <button
                  id="nav-emp-history"
                  onClick={() => setActiveTab('employee-history')}
                  className={`nav-item rounded-lg font-medium transition-colors cursor-pointer ${
                    activeTab === 'employee-history'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>신청 내역 조회</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
          {isMaster ? (
            <button
              id="nav-mobile-superadmin-audit"
              onClick={() => setActiveTab('admin-audit-logs')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                activeTab === 'admin-audit-logs'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>계정 이력 및 통합 관리</span>
              {pendingPasswordResetsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full">
                  {pendingPasswordResetsCount}
                </span>
              )}
            </button>
          ) : isRegularAdmin ? (
            /* ADMIN: [계정이력관리] 제외됨 */
            <>
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                전체 대시보드
              </button>
              <button
                id="nav-mobile-admin-approvals"
                onClick={() => setActiveTab('admin-approvals')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                  activeTab === 'admin-approvals'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>승인 관리</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold text-white bg-amber-500 rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button
                id="nav-mobile-admin-employees"
                onClick={() => setActiveTab('admin-employees')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${
                  activeTab === 'admin-employees'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>직원관리</span>
                {pendingEmployeesCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                    {pendingEmployeesCount}
                  </span>
                )}
              </button>
              <button
                id="nav-mobile-admin-quotas"
                onClick={() => setActiveTab('admin-quotas')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'admin-quotas'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                연차 관리
              </button>
              <button
                onClick={() => setActiveTab('admin-types')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'admin-types'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                휴가 유형
              </button>
              <button
                onClick={() => setActiveTab('employee-dashboard')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'employee-dashboard'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                내 연차
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('employee-dashboard')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'employee-dashboard'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                내 연차 대시보드
              </button>
              <button
                onClick={() => setActiveTab('employee-history')}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'employee-history'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                신청 내역 조회
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
