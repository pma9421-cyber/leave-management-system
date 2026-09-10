import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LeaveProvider, useLeave } from './context/LeaveContext.tsx';
import { AuditLogProvider } from './context/AuditLogContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthScreen } from './components/auth/AuthScreen.tsx';
import { PasswordChangeModal } from './components/auth/PasswordChangeModal.tsx';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard.tsx';
import { EmployeeHistory } from './components/employee/EmployeeHistory.tsx';
import { LeaveRequestModal } from './components/employee/LeaveRequestModal.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { ApprovalManagement } from './components/admin/ApprovalManagement.tsx';
import { EmployeeManagement } from './components/admin/EmployeeManagement.tsx';
import { AuditLogManagement } from './components/admin/AuditLogManagement.tsx';
import { LeaveTypeSettingsModal } from './components/admin/LeaveTypeSettingsModal.tsx';
import { EditCompanyModal } from './components/admin/EditCompanyModal.tsx';
import { isSuperAdmin, isCompanyAdmin } from './types.ts';
import { CheckCircle2, Trash2, Edit2, Building2 } from 'lucide-react';

function MainApp() {
  const { currentUser, isAuthenticated } = useAuth();
  const { leaveTypes, deleteLeaveType } = useLeave();

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isTypeSettingsOpen, setIsTypeSettingsOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [typeActionMsg, setTypeActionMsg] = useState<string>('');

  // Initialize and protect tabs based on role
  useEffect(() => {
    if (!currentUser) return;

    if (isSuperAdmin(currentUser.role)) {
      // 1. admin (SUPER_ADMIN) 계정은 [계정이력관리]만 있음. 그외 연차정보 필요없음.
      setActiveTab('admin-audit-logs');
    } else if (isCompanyAdmin(currentUser.role)) {
      // 2. admin 계정 외 [계정이력관리] 삭제.
      if (activeTab === 'dashboard' || activeTab === 'admin-audit-logs') {
        setActiveTab('admin-dashboard');
      }
    } else {
      // Employee role: protect against admin routes
      if (
        activeTab === 'admin-dashboard' ||
        activeTab === 'admin-approvals' ||
        activeTab === 'admin-employees' ||
        activeTab === 'admin-audit-logs' ||
        activeTab === 'admin-quotas' ||
        activeTab === 'admin-types' ||
        activeTab === 'dashboard'
      ) {
        setActiveTab('employee-dashboard');
      }
    }
  }, [currentUser?.id, currentUser?.role, activeTab]);

  // Track URL pathname and sync with popstate
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/login';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth Guard & URL Synchronization:
  // Unauthenticated users are strictly restricted to /login, while authenticated users on /login are routed to /
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
        setCurrentPath('/login');
      }
    } else {
      if (window.location.pathname === '/login') {
        window.history.replaceState(null, '', '/');
        setCurrentPath('/');
      }
    }
  }, [isAuthenticated, currentUser, currentPath]);

  // Protected Route Guard: If not authenticated, render login/register screen at /login
  if (!isAuthenticated || !currentUser) {
    return <AuthScreen />;
  }

  const isMaster = isSuperAdmin(currentUser.role);
  const isRegularAdmin = isCompanyAdmin(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Navbar with RBAC navigation and user profile */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewRequestModal={() => setIsLeaveModalOpen(true)}
      />

      {/* User and Role Status Bar */}
      <div className="bg-slate-900 text-white py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                isMaster
                  ? 'bg-amber-400 text-slate-950 font-black tracking-wide'
                  : isRegularAdmin
                  ? 'bg-purple-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {isMaster
                ? '최고 마스터 관리자 (SUPER_ADMIN)'
                : isRegularAdmin
                ? '관리자 권한 (ADMIN)'
                : '직원 권한 (EMPLOYEE)'}
            </span>
            <span className="hidden sm:inline text-slate-300">
              현재 접속자: <strong>{currentUser.name}</strong> ({currentUser.position || '사원'})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            <span>
              사업자등록번호: <strong className="text-slate-300 font-mono">{currentUser.businessNumber}</strong>
              {' · '}
              회사명: <strong className="text-slate-200">{currentUser.companyName || '회사'}</strong>
              {isMaster && (
                <span className="ml-1 text-[10px] text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.2 rounded">
                  고정
                </span>
              )}
            </span>
            {!isMaster && isRegularAdmin && (
              <button
                id="btn-topbar-edit-company"
                onClick={() => setIsEditCompanyOpen(true)}
                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="회사명(상호) 기재 및 수정"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>회사명 수정</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content View Container */}
      <main className="flex-1 pb-16">
        {/* 1. SUPER ADMIN VIEW: Only 계정 이력 및 통합 관리 (AuditLogManagement) */}
        {isMaster ? (
          <AuditLogManagement />
        ) : isRegularAdmin ? (
          /* 2. REGULAR ADMIN VIEWS (AuditLogManagement is strictly excluded) */
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                viewMode="dashboard"
                onNavigateToApprovals={() => setActiveTab('admin-approvals')}
              />
            )}

            {activeTab === 'admin-approvals' && <ApprovalManagement />}

            {activeTab === 'admin-employees' && <EmployeeManagement />}

            {activeTab === 'admin-quotas' && (
              <AdminDashboard
                viewMode="quota"
                onNavigateToApprovals={() => setActiveTab('admin-approvals')}
              />
            )}

            {activeTab === 'admin-types' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        휴가 종류 및 연차 차감 정책 관리
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        시스템에서 지원하는 연차, 반차, 병가 및 커스텀 특별 휴가를 설정합니다.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsTypeSettingsOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      새 휴가 종류 추가 / 설정
                    </button>
                  </div>

                  {typeActionMsg && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{typeActionMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {leaveTypes.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: t.color }}
                            ></span>
                            <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                t.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {t.isActive ? '사용중' : '비활성'}
                            </span>
                            <button
                              id={`btn-delete-type-${t.id}`}
                              title="휴가 종류 삭제"
                              onClick={() => {
                                if (window.confirm(`'${t.name}' 휴가 종류를 완전히 삭제하시겠습니까?`)) {
                                  deleteLeaveType(t.id);
                                  setTypeActionMsg(`'${t.name}' 휴가 종류가 삭제되었습니다.`);
                                  setTimeout(() => setTypeActionMsg(''), 3000);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">{t.description}</p>
                        <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-200/60">
                          <span>차감 일수: <strong>{t.deductionDays}일</strong></span>
                          <span>급여: <strong>{t.isPaid ? '유급' : '무급'}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employee-dashboard' && (
              <EmployeeDashboard
                onOpenRequestModal={() => setIsLeaveModalOpen(true)}
              />
            )}

            {activeTab === 'employee-history' && (
              <EmployeeHistory
                onOpenRequestModal={() => setIsLeaveModalOpen(true)}
              />
            )}
          </>
        ) : (
          /* 3. EMPLOYEE VIEWS */
          <>
            {activeTab === 'employee-dashboard' && (
              <EmployeeDashboard
                onOpenRequestModal={() => setIsLeaveModalOpen(true)}
              />
            )}

            {activeTab === 'employee-history' && (
              <EmployeeHistory
                onOpenRequestModal={() => setIsLeaveModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Force Password Change Modal (Shown if user logged in with temp password) */}
      <PasswordChangeModal isOpen={Boolean(currentUser?.requirePasswordChange)} />

      {/* Leave Application Modal (Only for regular admin and employees) */}
      {!isMaster && (
        <LeaveRequestModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          onSuccess={() => {
            // Stay on current tab
          }}
        />
      )}

      {/* Leave Type Settings Modal for Admin */}
      {isRegularAdmin && (
        <LeaveTypeSettingsModal
          isOpen={isTypeSettingsOpen}
          onClose={() => setIsTypeSettingsOpen(false)}
        />
      )}

      {/* Edit Company Name Modal */}
      <EditCompanyModal
        isOpen={isEditCompanyOpen}
        onClose={() => setIsEditCompanyOpen(false)}
        businessNumber={currentUser?.businessNumber}
        currentCompanyName={currentUser?.companyName}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            연차 및 휴가 관리 시스템 © {new Date().getFullYear()}. All rights reserved.
          </span>
          <span className="text-[11px] text-slate-400">
            Role-Based Access Control (RBAC) · Super Admin Master Portal
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuditLogProvider>
      <AuthProvider>
        <LeaveProvider>
          <MainApp />
        </LeaveProvider>
      </AuthProvider>
    </AuditLogProvider>
  );
}
