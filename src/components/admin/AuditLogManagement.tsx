import React, { useState, useMemo, useEffect } from 'react';
import { useAuditLog } from '../../context/AuditLogContext.tsx';
import { useAuth, normalizeBizNum, formatBizNum } from '../../context/AuthContext.tsx';
import { AuditLog, AuditLogActionType, User, UserRole, AccountStatus, PasswordResetRequest } from '../../types.ts';
import { AuditLogDetailModal } from './AuditLogDetailModal.tsx';
import { EditEmployeeModal } from './EditEmployeeModal.tsx';
import { CreateUserModal } from './CreateUserModal.tsx';
import { IssueTempPasswordModal } from './IssueTempPasswordModal.tsx';
import { EditCompanyModal } from './EditCompanyModal.tsx';
import {
  History,
  Search,
  Calendar,
  Filter,
  Download,
  Shield,
  User as UserIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Settings,
  FileSpreadsheet,
  Building2,
  Users,
  KeyRound,
  Trash2,
  Edit,
  Edit2,
  UserPlus,
  PowerOff,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';

export const AuditLogManagement: React.FC = () => {
  const { queryLogs, exportToCsv } = useAuditLog();
  const {
    users,
    currentUser,
    deleteUser,
    toggleUserStatus,
    passwordResetRequests,
    businessAdminLimits,
    getBusinessAdminLimit,
    setBusinessAdminLimit,
  } = useAuth();

  // Top Level Tab in Master Admin Portal
  const [activeSubTab, setActiveSubTab] = useState<
    'audit-logs' | 'user-control' | 'password-resets' | 'admin-limits'
  >('audit-logs');

  const [companyEditBiz, setCompanyEditBiz] = useState<{
    isOpen: boolean;
    bizNum: string;
    companyName: string;
  }>({
    isOpen: false,
    bizNum: '',
    companyName: '',
  });

  // --- Audit Log Filter States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<AuditLogActionType | 'ALL'>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Selected Log for Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- User Control States ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userBizFilter, setUserBizFilter] = useState<string>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [editTargetUser, setEditTargetUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Password Reset States ---
  const [pwFilterStatus, setPwFilterStatus] = useState<string>('ALL');
  const [selectedPwRequest, setSelectedPwRequest] = useState<PasswordResetRequest | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // --- Business Admin Limit States ---
  const [editingBizLimits, setEditingBizLimits] = useState<{ [bizNum: string]: number }>({});

  // Toast / Feedback
  const [toastMsg, setToastMsg] = useState<string>('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Distinct business numbers in the system
  const distinctBizNums = useMemo(() => {
    const map = new Map<string, { bizNum: string; companyName: string; userCount: number; adminCount: number }>();
    users.forEach((u) => {
      const formatted = formatBizNum(u.businessNumber);
      const isMasterBiz = formatted === '999-99-99999';
      if (!map.has(formatted)) {
        map.set(formatted, {
          bizNum: formatted,
          companyName: isMasterBiz ? 'admin' : (u.companyName || '회사'),
          userCount: 0,
          adminCount: 0,
        });
      }
      const entry = map.get(formatted)!;
      entry.userCount += 1;
      if (u.role === 'ADMIN') {
        entry.adminCount += 1;
      }
    });
    return Array.from(map.values());
  }, [users]);

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [users]);

  // Query audit logs
  const { data: logs, pagination, stats } = useMemo(() => {
    return queryLogs({
      search: searchTerm,
      actionType: selectedType,
      department: selectedDept,
      startDate,
      endDate,
      page: currentPage,
      limit: pageSize,
      sortOrder,
    });
  }, [queryLogs, searchTerm, selectedType, selectedDept, startDate, endDate, currentPage, pageSize, sortOrder]);

  // Filtered users for User Control View
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Exclude master admin from subordinate list if desired, or show with special badge
      if (userBizFilter !== 'ALL' && normalizeBizNum(u.businessNumber) !== normalizeBizNum(userBizFilter)) {
        return false;
      }
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) {
        return false;
      }
      if (userSearchTerm.trim()) {
        const q = userSearchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        const matchPos = u.position?.toLowerCase().includes(q);
        const matchBiz = u.businessNumber.includes(q);
        if (!matchName && !matchEmail && !matchDept && !matchPos && !matchBiz) {
          return false;
        }
      }
      return true;
    });
  }, [users, userBizFilter, userRoleFilter, userSearchTerm]);

  // Filtered password requests
  const filteredPwRequests = useMemo(() => {
    return passwordResetRequests.filter((r) => {
      if (pwFilterStatus !== 'ALL' && r.status !== pwFilterStatus) {
        return false;
      }
      return true;
    });
  }, [passwordResetRequests, pwFilterStatus]);

  const pendingPwCount = passwordResetRequests.filter((r) => r.status === 'PENDING').length;

  // Handle Quota Limit Update
  const handleSaveBizLimit = async (bizNum: string) => {
    const val = editingBizLimits[bizNum] ?? getBusinessAdminLimit(bizNum);
    const res = await setBusinessAdminLimit(bizNum, val);
    if (res.success) {
      showToast(`사업자번호 [${bizNum}] 관리자 생성 한도가 ${val}개로 중앙 DB에 저장되었습니다.`);
    } else {
      showToast(res.error || '한도 저장 실패');
    }
  };

  const getActionBadge = (type: AuditLogActionType) => {
    switch (type) {
      case 'ACCOUNT_CREATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">계정 생성</span>;
      case 'ACCOUNT_DELETE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">계정 삭제</span>;
      case 'PROFILE_UPDATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">정보 수정</span>;
      case 'ROLE_CHANGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">권한 변경</span>;
      case 'STATUS_CHANGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">상태 변경</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">로그인</span>;
      case 'LOGOUT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">로그아웃</span>;
      case 'PASSWORD_RESET':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">비밀번호 변경</span>;
      case 'QUOTA_CHANGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">연차/한도 변경</span>;
      case 'YEAR_TRANSITION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">연도 전환/이월</span>;
      case 'QUOTA_GRANT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">신규 연차 부여</span>;
      case 'LEAVE_DEDUCTION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">연차 차감</span>;
      case 'LEAVE_APPLY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">휴가 신청</span>;
      case 'LEAVE_APPROVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">결재 승인</span>;
      case 'LEAVE_REJECT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">결재 반려</span>;
      case 'LEAVE_CANCEL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">휴가 취소</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-slate-900 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-slate-950 uppercase tracking-wide">
                SUPER ADMIN MASTER PORTAL
              </span>
              <span className="text-xs text-amber-100">전체 사업자번호 통합 제어 시스템</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5">
              계정 이력 및 마스터 통합 관리
            </h1>
            <p className="text-xs text-amber-100/90 mt-1 max-w-2xl">
              시스템 내 등록된 모든 사업장의 관리자·직원 계정을 통합 조회·수정·삭제하고,
              비밀번호 재설정 임시번호 발급 및 사업자별 관리자 계정 생성 한도를 총괄 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-amber-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>신규 계정 직접 생성</span>
            </button>
          </div>
        </div>

        {/* Global Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-amber-100 font-medium block">총 감사 이력</span>
            <span className="text-lg font-black text-white mt-0.5 block">{stats.totalLogs}건</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-amber-100 font-medium block">등록 계정 (전체)</span>
            <span className="text-lg font-black text-white mt-0.5 block">
              {users.length}명 <span className="text-xs font-normal text-amber-200">(관리자 {users.filter((u) => u.role === 'ADMIN').length})</span>
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-amber-100 font-medium block">등록 사업장</span>
            <span className="text-lg font-black text-white mt-0.5 block">{distinctBizNums.length}개사</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[11px] text-amber-100 font-medium block">비밀번호 재설정 신청</span>
            <span className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
              <span>{pendingPwCount}건 대기</span>
              {pendingPwCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Master Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSubTab('audit-logs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'audit-logs'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>계정 이력(Audit Log) 검색 및 조회</span>
        </button>

        <button
          onClick={() => setActiveSubTab('user-control')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'user-control'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>전체 사업장 계정 통합 관리 ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('password-resets')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'password-resets'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>비밀번호 재설정 신청 & 임시번호 발급</span>
          {pendingPwCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {pendingPwCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('admin-limits')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'admin-limits'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>사업자별 관리자 계정 생성 한도 설정</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: AUDIT LOGS VIEW                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit-logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  id="input-audit-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="이름, 이메일, 내용 검색..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Action Type Filter */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="ALL">전체 이력 유형</option>
                  <option value="YEAR_TRANSITION">연도 전환/이월</option>
                  <option value="QUOTA_GRANT">신규 연차 부여</option>
                  <option value="QUOTA_CHANGE">연차/한도 변경</option>
                  <option value="LEAVE_DEDUCTION">연차 차감</option>
                  <option value="LEAVE_APPLY">휴가 신청</option>
                  <option value="LEAVE_APPROVE">결재 승인</option>
                  <option value="LEAVE_REJECT">결재 반려</option>
                  <option value="LEAVE_CANCEL">휴가 취소</option>
                  <option value="ACCOUNT_CREATE">계정 생성</option>
                  <option value="ACCOUNT_DELETE">계정 삭제</option>
                  <option value="PROFILE_UPDATE">정보 수정</option>
                  <option value="ROLE_CHANGE">권한 변경</option>
                  <option value="STATUS_CHANGE">상태 변경/승인</option>
                  <option value="LOGIN">로그인</option>
                  <option value="LOGOUT">로그아웃</option>
                  <option value="PASSWORD_RESET">비밀번호 변경</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="ALL">전체 부서</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Size & Export */}
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value={20}>20개씩</option>
                  <option value={50}>50개씩</option>
                  <option value={100}>100개씩</option>
                </select>
                <button
                  onClick={() => {
                    exportToCsv();
                    showToast('감사 이력 CSV 파일이 다운로드되었습니다.');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV 다운로드</span>
                </button>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">기간 조회:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
              />
              <span className="text-slate-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:underline ml-1"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">일시</th>
                    <th className="py-3 px-4">이력 유형</th>
                    <th className="py-3 px-4">작업 내용</th>
                    <th className="py-3 px-4">대상 계정</th>
                    <th className="py-3 px-4">소속 부서 / 권한</th>
                    <th className="py-3 px-4">작업자</th>
                    <th className="py-3 px-4 text-center">상세 보기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        조회된 이력 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(log.actionType)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {log.actionTitle}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {log.details}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{log.userName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{log.userEmail}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-700 block">{log.userDepartment || '-'}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {log.userRole}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">
                            {log.operatorName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            IP: {log.ipAddress}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="상세 내역 확인"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  전체 {pagination.total}건 중 {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)}건 표시
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1 rounded border border-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-slate-800">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1 rounded border border-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: USER CONTROL (모든 사업자번호 계정 통합 제어)                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'user-control' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="이름, 이메일, 사업자번호 검색..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Business Number Filter */}
              <select
                value={userBizFilter}
                onChange={(e) => setUserBizFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">전체 사업자번호</option>
                {distinctBizNums.map((b) => (
                  <option key={b.bizNum} value={b.bizNum}>
                    {b.bizNum} ({b.companyName})
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">전체 권한 등급</option>
                <option value="SUPER_ADMIN">최고 관리자 (SUPER_ADMIN)</option>
                <option value="ADMIN">관리자 (ADMIN)</option>
                <option value="EMPLOYEE">일반 직원 (EMPLOYEE)</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ 계정 직접 생성</span>
            </button>
          </div>

          {/* User Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">사업자번호 / 회사</th>
                    <th className="py-3 px-4">성명 / 이메일</th>
                    <th className="py-3 px-4">권한 등급</th>
                    <th className="py-3 px-4">부서 / 직급</th>
                    <th className="py-3 px-4">입사일자</th>
                    <th className="py-3 px-4 text-center">계정 상태</th>
                    <th className="py-3 px-4 text-center">계정 제어 / 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        일치하는 계정이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isMe = u.id === currentUser?.id;
                      const isSuper = u.role === 'SUPER_ADMIN';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800 block">
                              {u.businessNumber}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {u.companyName || '회사'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-900 font-black">
                                  본인
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 block">
                              {u.email}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'SUPER_ADMIN'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                  : u.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {u.role === 'SUPER_ADMIN'
                                ? 'SUPER_ADMIN'
                                : u.role === 'ADMIN'
                                ? 'ADMIN (관리자)'
                                : 'EMPLOYEE (직원)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-slate-800 font-medium block">
                              {u.department || '-'}
                            </span>
                            <span className="text-[11px] text-slate-500">{u.position}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {u.joinedDate}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : u.status === 'INACTIVE'
                                  ? 'bg-rose-100 text-rose-800 font-bold'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {u.status === 'APPROVED'
                                ? '정상 활성'
                                : u.status === 'INACTIVE'
                                ? '이용 정지'
                                : u.status === 'PENDING'
                                ? '승인 대기'
                                : '반려'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit User Button */}
                              <button
                                onClick={() => {
                                  setEditTargetUser(u);
                                  setIsEditModalOpen(true);
                                }}
                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="계정 정보 및 권한 수정"
                              >
                                <Edit className="w-3 h-3" />
                                <span>수정</span>
                              </button>

                              {/* Status Toggle (Active / Inactive) */}
                              {!isSuper && (
                                <button
                                  onClick={() => {
                                    const nextStatus = u.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED';
                                    toggleUserStatus(u.id, nextStatus);
                                    showToast(
                                      nextStatus === 'INACTIVE'
                                        ? `${u.name} 계정이 비활성화(이용 정지)되었습니다.`
                                        : `${u.name} 계정이 활성화되었습니다.`
                                    );
                                  }}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                                    u.status === 'INACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                  title={u.status === 'INACTIVE' ? '계정 활성화' : '계정 이용 정지'}
                                >
                                  {u.status === 'INACTIVE' ? (
                                    <>
                                      <UserCheck className="w-3 h-3" />
                                      <span>활성화</span>
                                    </>
                                  ) : (
                                    <>
                                      <PowerOff className="w-3 h-3" />
                                      <span>정지</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* 4. Delete User Button (Trash Icon) */}
                              <button
                                id={`btn-audit-delete-user-${u.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isMe) {
                                    showToast('현재 로그인 중인 마스터 관리자 본인 계정은 삭제할 수 없습니다.');
                                    return;
                                  }
                                  setUserToDelete(u);
                                }}
                                disabled={isMe}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isMe
                                    ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-300'
                                    : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 hover:border-rose-300 cursor-pointer shadow-2xs'
                                }`}
                                title={isMe ? '현재 로그인 본인 계정은 삭제할 수 없습니다.' : '계정 영구 삭제 (클릭 시 확인 모달 표시)'}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PASSWORD RESETS & TEMP PASSWORDS                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'password-resets' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>관리자 및 직원 비밀번호 재설정 신청 관리</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                사용자가 로그인 화면에서 비밀번호 찾기를 신청하면 여기서 임시 비밀번호를 발급할 수 있습니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pwFilterStatus}
                onChange={(e) => setPwFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="ALL">전체 신청 상태</option>
                <option value="PENDING">대기 중 (PENDING)</option>
                <option value="ISSUED">임시번호 발급됨 (ISSUED)</option>
                <option value="COMPLETED">새 번호 변경 완료 (COMPLETED)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">신청 일시</th>
                    <th className="py-3 px-4">사업자번호</th>
                    <th className="py-3 px-4">신청자 성명 / 메일</th>
                    <th className="py-3 px-4">권한 등급</th>
                    <th className="py-3 px-4">진행 상태</th>
                    <th className="py-3 px-4">임시 비밀번호 보안</th>
                    <th className="py-3 px-4 text-center">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPwRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        접수된 비밀번호 재설정 신청 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredPwRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {req.requestedAt}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                          {req.businessNumber}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{req.userName}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{req.userEmail}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {req.userRole}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {req.status === 'PENDING' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              <span>임시번호 발급 대기</span>
                            </span>
                          ) : req.status === 'ISSUED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              임시번호 발급 완료
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              새 비밀번호 변경 완료
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {req.status === 'PENDING' ? (
                            <span className="text-slate-400 text-[11px]">미발급</span>
                          ) : (
                            <span className="text-[11px] text-indigo-700 font-semibold">
                              원문 미저장 · 발급 시 1회 표시
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          {req.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                setSelectedPwRequest(req);
                                setIsIssueModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              임시번호 발급하기
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPwRequest(req);
                                setIsIssueModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                            >
                              재발급
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: BUSINESS ADMIN LIMITS (사업자별 관리자 계정 생성 한도)         */}
      {/* ========================================================================= */}
      {activeSubTab === 'admin-limits' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <span>사업자등록번호별 관리자(ADMIN) 계정 생성 한도 설정</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                  각 사업장별로 허용되는 관리자(ADMIN) 계정의 최대 생성 개수를 제어합니다.
                  <br />
                  <strong>기본 규칙:</strong> 기본 관리자 계정은 <strong>최대 1개</strong>로 제한되며,
                  한도에 도달하면 신규 회원가입 및 관리자 권한 변경이 자동으로 차단됩니다.
                  추가 관리자가 필요한 사업장은 시스템 최고 관리자가 여기서 한도를 증설(예: 2개, 3개...)할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">사업자등록번호</th>
                    <th className="py-3 px-4">회사명</th>
                    <th className="py-3 px-4">소속 총 계정</th>
                    <th className="py-3 px-4">현재 생성된 관리자(ADMIN) 수</th>
                    <th className="py-3 px-4">최대 허용 한도 (설정)</th>
                    <th className="py-3 px-4">한도 상태</th>
                    <th className="py-3 px-4 text-center">저장 및 적용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distinctBizNums.map((b) => {
                    const currentLimit = getBusinessAdminLimit(b.bizNum);
                    const editingVal = editingBizLimits[b.bizNum] ?? currentLimit;
                    const isAtLimit = b.adminCount >= currentLimit;

                    return (
                      <tr key={b.bizNum} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {b.bizNum}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{b.bizNum === '999-99-99999' ? 'admin' : b.companyName}</span>
                            {b.bizNum === '999-99-99999' ? (
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-normal px-1.5 py-0.2 rounded border border-slate-200">
                                고정
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCompanyEditBiz({
                                    isOpen: true,
                                    bizNum: b.bizNum,
                                    companyName: b.companyName,
                                  });
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="회사명(상호) 수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {b.userCount}명
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {b.adminCount}명
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.max(1, editingVal - 1);
                                setEditingBizLimits((prev) => ({ ...prev, [b.bizNum]: nextVal }));
                              }}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={editingVal}
                              onChange={(e) => {
                                const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setEditingBizLimits((prev) => ({ ...prev, [b.bizNum]: v }));
                              }}
                              className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = editingVal + 1;
                                setEditingBizLimits((prev) => ({ ...prev, [b.bizNum]: nextVal }));
                              }}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                            <span className="text-slate-500 text-[11px] ml-1">개</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAtLimit ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              한도 도달 ({b.adminCount}/{currentLimit})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              여유 있음 ({b.adminCount}/{currentLimit})
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleSaveBizLimit(b.bizNum)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            한도 설정 저장
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal for Audit Log */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedLog(null);
        }}
      />

      {/* Edit User Modal */}
      <EditEmployeeModal
        user={editTargetUser}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditTargetUser(null);
        }}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => showToast(msg || '신규 계정이 생성되었습니다.')}
      />

      {/* Issue Temp Password Modal */}
      <IssueTempPasswordModal
        request={selectedPwRequest}
        isOpen={isIssueModalOpen}
        onClose={() => {
          setIsIssueModalOpen(false);
          setSelectedPwRequest(null);
        }}
        onSuccess={() => {
          showToast('임시 비밀번호가 성공적으로 발급되었습니다.');
        }}
      />

      {/* Custom Delete Confirmation Modal (Iframe-Safe) */}
      {userToDelete && (
        <div
          id="modal-confirm-delete-user"
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">계정 영구 삭제 확인</h3>
                <p className="text-xs text-slate-500 mt-1">
                  선택하신 계정을 시스템에서 영구적으로 삭제하시겠습니까?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">사용자 성명:</span>
                <span className="font-bold text-slate-900">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">로그인 이메일:</span>
                <span className="font-mono font-semibold text-slate-800">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">사업자등록번호:</span>
                <span className="font-mono text-slate-800">{userToDelete.businessNumber} ({userToDelete.companyName || '회사'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">소속 부서 / 직급:</span>
                <span className="text-slate-800">{userToDelete.department || '-'} / {userToDelete.position || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">현재 계정 권한:</span>
                <span className="font-bold text-rose-600">{userToDelete.role}</span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[11px] text-amber-900 leading-relaxed space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>데이터 보존 및 보안 안내</span>
              </p>
              <p>
                계정 삭제 시 사용자 목록 및 로그인 자격이 영구 제거됩니다. 단, 과거 이 사용자가 승인/신청/변경한 <strong>감사 이력(Audit Log)</strong>은 회계 및 보안 감사를 위해 안전하게 영구 보존됩니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-delete-modal"
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                id="btn-confirm-delete-user-submit"
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await deleteUser(userToDelete.id);
                    if (res.success) {
                      showToast(`[${userToDelete.name}] Supabase 인증 계정까지 영구 삭제되었습니다.`);
                      setUserToDelete(null);
                    } else {
                      showToast(res.error || '계정 삭제에 실패했습니다.');
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '삭제 중...' : '계정 영구 삭제'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={companyEditBiz.isOpen}
        onClose={() => setCompanyEditBiz({ isOpen: false, bizNum: '', companyName: '' })}
        businessNumber={companyEditBiz.bizNum}
        currentCompanyName={companyEditBiz.companyName}
        onSuccess={(newName) => {
          showToast(`사업자번호(${companyEditBiz.bizNum})의 회사명이 '${newName}'(으)로 갱신되었습니다.`);
        }}
      />
    </div>
  );
};
