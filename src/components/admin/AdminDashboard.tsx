import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { User } from '../../types.ts';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import { MonthlyLeaveChart } from '../charts/MonthlyLeaveChart.tsx';
import { MonthlyLeaveCalendar } from './MonthlyLeaveCalendar.tsx';
import { QuotaManagementModal } from './QuotaManagementModal.tsx';
import { AdminProxyLeaveModal } from './AdminProxyLeaveModal.tsx';
import { ExcelExportModal } from './ExcelExportModal.tsx';
import {
  Users,
  Clock,
  TrendingDown,
  Search,
  Edit3,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateToApprovals: () => void;
  viewMode?: 'dashboard' | 'quota';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToApprovals,
  viewMode = 'dashboard',
}) => {
  const { companyUsers: users, getUserQuota } = useAuth();
  const { leaveRequests, leaveTypes, workYear, setWorkYear } = useLeave();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForQuota, setSelectedUserForQuota] = useState<User | null>(null);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isProxyLeaveModalOpen, setIsProxyLeaveModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  const companyUserIds = useMemo(() => new Set(users.map((u) => u.id)), [users]);
  const companyLeaveRequests = useMemo(
    () => leaveRequests.filter((request) => companyUserIds.has(request.userId)),
    [leaveRequests, companyUserIds]
  );

  const totalEmployees = users.length;
  const pendingCount = companyLeaveRequests.filter((request) => request.status === 'PENDING').length;

  const totalCompanyQuota = users.reduce((accumulator, user) => {
    const quota = getUserQuota(user.id, workYear);
    return accumulator + quota.totalLeaveDays;
  }, 0);

  const totalCompanyUsed = users.reduce((accumulator, user) => {
    const quota = getUserQuota(user.id, workYear);
    const yearApprovedRequests = companyLeaveRequests.filter(
      (request) =>
        request.userId === user.id &&
        request.status === 'APPROVED' &&
        request.startDate &&
        request.startDate.startsWith(String(workYear))
    );

    const leaveDaysUsedInYear = yearApprovedRequests.reduce((sum, request) => {
      const leaveType = leaveTypes.find((type) => type.id === request.leaveTypeId);
      return sum + calculateLeaveDeduction(leaveType, request.requestedDays);
    }, 0);

    const usedDays =
      typeof quota.usedLeaveDays === 'number' && quota.usedLeaveDays > 0
        ? quota.usedLeaveDays
        : leaveDaysUsedInYear;

    return accumulator + usedDays;
  }, 0);

  const totalCompanyRemaining = Number((totalCompanyQuota - totalCompanyUsed).toFixed(1));

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const lowered = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowered) ||
        user.email.toLowerCase().includes(lowered) ||
        user.position.toLowerCase().includes(lowered)
    );
  }, [users, searchQuery]);

  const handleOpenQuotaModal = (user: User) => {
    setSelectedUserForQuota(user);
    setIsQuotaModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {viewMode === 'dashboard' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                전사 연차 및 휴가 총괄 대시보드
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                전체 직원의 연차 부여 현황 조회, 개별 연차 일수 조절 및 실시간 휴가 승인 관리를 진행합니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-open-proxy-leave"
                onClick={() => setIsProxyLeaveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>대리 휴가 신청</span>
              </button>

              <button
                id="btn-open-excel-export"
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>엑셀 백업 및 다운로드</span>
              </button>
            </div>
          </div>

          {adjustSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{adjustSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">총 등록 직원 수</span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{totalEmployees}</span>
                <span className="text-sm font-medium text-slate-500">명</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">관리자 및 전 직원 포함</p>
            </div>

            <div
              onClick={onNavigateToApprovals}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${
                pendingCount > 0
                  ? 'border-amber-300 bg-amber-50/20 hover:bg-amber-50/40'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">승인 대기 중 신청</span>
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-amber-600">{pendingCount}</span>
                  <span className="text-sm font-medium text-slate-500">건</span>
                </div>
                {pendingCount > 0 && (
                  <span className="text-xs text-amber-700 font-semibold flex items-center gap-1 hover:underline">
                    <span>승인하기</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-700/80 mt-1">즉시 검토가 필요한 휴가 결재 건</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">전사 총 사용 연차</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">{totalCompanyUsed.toFixed(1)}</span>
                <span className="text-sm font-medium text-slate-500">/ {totalCompanyQuota}일</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">전사 부여 대비 총 소진일</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">전사 총 잔여 연차</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-indigo-600">{totalCompanyRemaining}</span>
                <span className="text-sm font-medium text-slate-500">일</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">임직원 보유 총 잔여 연차 일수 합계</p>
            </div>
          </div>

          <MonthlyLeaveCalendar requests={companyLeaveRequests} />

          <MonthlyLeaveChart
            requests={companyLeaveRequests}
            leaveTypes={leaveTypes}
            title="전사 월별 휴가 사용 현황 통계 시각화"
            subtitle={`${workYear}년 전 임직원 승인 휴가 일수 종합 분석 및 월별 집계표`}
            year={workYear}
            onYearChange={(year) => setWorkYear(year)}
          />
        </>
      )}

      {viewMode === 'quota' && (
        <>
          <div id="section-admin-employee-table" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  전체 직원 연차 현황 모니터링 및 연차 관리
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  각 직원별 총 연차일수와 잔여 현황을 확인하고, 상세 모달을 통해 연차를 관리합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="직원 이름, 직급 검색..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">직원 정보</th>
                    <th className="py-3 px-4">직급</th>
                    <th className="py-3 px-4">입사일</th>
                    <th className="py-3 px-4 text-center">연차 상세 구성 (총 / 법정 · 이월 · 보상)</th>
                    <th className="py-3 px-4 text-center">사용일수</th>
                    <th className="py-3 px-4 text-center">남은 연차</th>
                    <th className="py-3 px-4 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        검색 조건과 일치하는 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((employee) => {
                      const quota = getUserQuota(employee.id, workYear);
                      const joinYear = employee.joinedDate ? parseInt(employee.joinedDate.slice(0, 4), 10) : 2026;
                      const isBeforeJoin = workYear < joinYear;

                      const statutory =
                        typeof quota.statutoryLeaveDays === 'number'
                          ? quota.statutoryLeaveDays
                          : (quota.baseQuota ?? 15);
                      const carried =
                        typeof quota.carriedOverLeaveDays === 'number'
                          ? quota.carriedOverLeaveDays
                          : (quota.carryOverDays ?? 0);
                      const compensatory =
                        typeof quota.compensatoryLeaveDays === 'number' ? quota.compensatoryLeaveDays : 0;
                      const totalDays =
                        typeof quota.totalLeaveDays === 'number'
                          ? quota.totalLeaveDays
                          : Number((statutory + carried + compensatory).toFixed(1));

                      const yearApprovedRequests = leaveRequests.filter(
                        (request) =>
                          request.userId === employee.id &&
                          request.status === 'APPROVED' &&
                          request.startDate &&
                          request.startDate.startsWith(String(workYear))
                      );

                      const calculatedUsedDays = yearApprovedRequests.reduce((sum, request) => {
                        const leaveType = leaveTypes.find((type) => type.id === request.leaveTypeId);
                        return sum + calculateLeaveDeduction(leaveType, request.requestedDays);
                      }, 0);

                      const usedDays =
                        typeof quota.usedLeaveDays === 'number' && quota.usedLeaveDays > 0
                          ? quota.usedLeaveDays
                          : calculatedUsedDays;
                      const remaining = Number((totalDays - usedDays).toFixed(1));

                      return (
                        <tr key={employee.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                                {employee.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{employee.name}</span>
                                  {employee.role === 'ADMIN' && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-semibold">
                                      관리자
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400">{employee.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="inline-flex items-center font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs">
                              {employee.position || '사원'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">{employee.joinedDate}</td>

                          <td className="py-3.5 px-4 text-center">
                            {isBeforeJoin ? (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                                  입사 전 ({employee.joinedDate} 입사)
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="font-extrabold text-slate-900 text-sm">총 {totalDays}일</div>
                                <div className="text-[10.5px] font-medium flex items-center justify-center gap-1.5 mt-0.5 text-slate-500">
                                  <span title="법정연차" className="text-slate-600 font-semibold">
                                    법정 {statutory}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span
                                    title="이월연차 (음수/양수)"
                                    className={`font-semibold ${
                                      carried < 0
                                        ? 'text-rose-600'
                                        : carried > 0
                                        ? 'text-blue-600'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    이월 {carried > 0 ? `+${carried}` : carried}
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span
                                    title="보상연차"
                                    className={`font-semibold ${
                                      compensatory > 0 ? 'text-emerald-600' : 'text-slate-400'
                                    }`}
                                  >
                                    보상 {compensatory}
                                  </span>
                                </div>
                              </>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {isBeforeJoin ? '-' : `${usedDays}일`}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isBeforeJoin ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : (
                              <span
                                className={`font-extrabold px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1 ${
                                  remaining < 0
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300 font-black'
                                    : remaining < 3
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}
                              >
                                {remaining}일
                                {remaining < 0 && (
                                  <span className="text-[10px] text-rose-600 font-bold">(초과)</span>
                                )}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              id={`btn-manage-quota-${employee.id}`}
                              onClick={() => handleOpenQuotaModal(employee)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>연차 관리</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <QuotaManagementModal
        user={selectedUserForQuota}
        isOpen={isQuotaModalOpen}
        initialYear={workYear}
        onClose={() => {
          setIsQuotaModalOpen(false);
          setSelectedUserForQuota(null);
        }}
      />

      <AdminProxyLeaveModal
        isOpen={isProxyLeaveModalOpen}
        onClose={() => setIsProxyLeaveModalOpen(false)}
        onSuccess={(message) => {
          setAdjustSuccessMsg(message);
          setTimeout(() => setAdjustSuccessMsg(''), 4000);
        }}
      />

      <ExcelExportModal isOpen={isExcelModalOpen} onClose={() => setIsExcelModalOpen(false)} />
    </div>
  );
};
