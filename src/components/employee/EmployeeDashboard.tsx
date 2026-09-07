import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { MonthlyLeaveChart } from '../charts/MonthlyLeaveChart.tsx';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Calendar,
  TrendingDown,
} from 'lucide-react';

interface EmployeeDashboardProps {
  onOpenRequestModal: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onOpenRequestModal,
}) => {
  const { currentUser, getUserQuota } = useAuth();
  const { leaveRequests, leaveTypes, workYear } = useLeave();

  const [selectedYear, setSelectedYear] = useState<number>(workYear || 2026);

  if (!currentUser) return null;

  // Filter requests for current user
  const myRequests = useMemo(() => {
    return leaveRequests.filter((r) => r.userId === currentUser.id);
  }, [leaveRequests, currentUser.id]);

  // Read user quota breakdown
  const currentQuota = getUserQuota(currentUser.id, selectedYear);
  const statutory = typeof currentUser.statutoryLeaveDays === 'number' ? currentUser.statutoryLeaveDays : 15;
  const carried = typeof currentUser.carriedOverLeaveDays === 'number' ? currentUser.carriedOverLeaveDays : 0;
  const compensatory = typeof currentUser.compensatoryLeaveDays === 'number' ? currentUser.compensatoryLeaveDays : 0;
  const totalLeave = Number((statutory + carried + compensatory).toFixed(1));
  const usedLeave = currentUser.usedLeaveDays ?? 0;
  const remainingLeave = Number((totalLeave - usedLeave).toFixed(1));
  const usagePercentage = totalLeave > 0 ? Math.min(100, Math.round((usedLeave / totalLeave) * 100)) : 0;

  // Pending count for current user
  const pendingCount = myRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium text-blue-100">
              {currentUser.position || '사원'}
            </span>
            <span className="text-xs text-blue-200">입사일: {currentUser.joinedDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
            안녕하세요, {currentUser.name}님!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
            현재 잔여 연차는 총 <strong>{remainingLeave}일</strong>입니다. 자유롭게 휴가를 계획하고 재충전하세요.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            id="btn-emp-banner-apply"
            onClick={onOpenRequestModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-sm font-bold shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>새 휴가 신청하기</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Leave Days */}
        <div id="card-total-leave" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">부여된 총 연차</span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">{totalLeave}</span>
            <span className="text-sm font-medium text-slate-500">일</span>
          </div>
          {/* Detailed Breakdown Badges: Statutory / Carried / Compensatory */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold" title="법정연차">
              법정 {statutory}일
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-semibold ${
                carried < 0
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : carried > 0
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
              title="이월연차 (음수/양수)"
            >
              이월 {carried > 0 ? `+${carried}` : carried}일
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold" title="보상연차">
              보상 {compensatory}일
            </span>
          </div>
        </div>

        {/* Card 2: Used Leave Days */}
        <div id="card-used-leave" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">사용한 연차</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-amber-600">{usedLeave}</span>
            <span className="text-sm font-medium text-slate-500">일</span>
            <span className="text-xs font-semibold text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded">
              소진율 {usagePercentage}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Remaining Leave Days (Supports Negative Minus) */}
        <div
          id="card-remaining-leave"
          className={`rounded-xl border p-5 shadow-xs transition-all ${
            remainingLeave < 0
              ? 'bg-rose-50/50 border-rose-200'
              : 'bg-white border-blue-200 bg-blue-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${remainingLeave < 0 ? 'text-rose-800' : 'text-blue-800'}`}>
              남은 잔여 연차
            </span>
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                remainingLeave < 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold ${remainingLeave < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
              {remainingLeave}
            </span>
            <span className="text-sm font-medium text-slate-500">일</span>
            {remainingLeave < 0 && (
              <span className="text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md ml-2 font-black border border-rose-200">
                초과사용 (-{Math.abs(remainingLeave)}일)
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md ml-2 font-medium">
                대기중 {pendingCount}건
              </span>
            )}
          </div>
          <p className={`text-xs mt-1.5 leading-relaxed ${remainingLeave < 0 ? 'text-rose-600 font-medium' : 'text-blue-600/80'}`}>
            {remainingLeave < 0
              ? '총연차보다 사용일수가 많아 음수(-) 상태입니다. 연차 이월 시 자동 정산/차감됩니다.'
              : '신청 가능한 유효 연차 일수입니다.'}
          </p>
        </div>
      </div>

      {/* Monthly Statistics Chart (나의 월별 휴가 사용 내역 통계 - 표 상단 년도 필터 및 월별 상세 집계표 포함) */}
      <MonthlyLeaveChart
        requests={myRequests}
        leaveTypes={leaveTypes}
        title="나의 월별 휴가 사용 내역 통계"
        subtitle={`${currentUser.name}님의 월별 승인 휴가 추이 및 사용 상세 내역`}
        year={selectedYear}
        onYearChange={(y) => setSelectedYear(y)}
      />
    </div>
  );
};
