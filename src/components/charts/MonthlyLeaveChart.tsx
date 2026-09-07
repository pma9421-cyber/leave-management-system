import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { LeaveRequest, LeaveType } from '../../types.ts';
import { Calendar, CalendarDays } from 'lucide-react';

interface MonthlyLeaveChartProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  title?: string;
  subtitle?: string;
  year?: number;
  onYearChange?: (year: number) => void;
}

export const MonthlyLeaveChart: React.FC<MonthlyLeaveChartProps> = ({
  requests,
  title = '월별 휴가 사용 통계',
  subtitle,
  year = 2026,
  onYearChange,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(year);

  useEffect(() => {
    setSelectedYear(year);
  }, [year]);

  const handleYearSelect = (newYear: number) => {
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  // Generate 12 months data
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Filter approved requests for the selected year
  const approvedRequests = requests.filter((r) => {
    if (r.status !== 'APPROVED') return false;
    const reqYear = new Date(r.startDate).getFullYear();
    return reqYear === selectedYear;
  });

  const chartData = months.map((m) => {
    const monthStr = `${m}월`;
    const inMonthRequests = approvedRequests.filter((r) => {
      const d = new Date(r.startDate);
      return d.getMonth() + 1 === m;
    });

    let annualDays = 0;
    let halfDays = 0;
    let sickDays = 0;
    let otherDays = 0;

    inMonthRequests.forEach((r) => {
      if (r.leaveTypeName.includes('연차')) {
        annualDays += r.requestedDays;
      } else if (r.leaveTypeName.includes('반차')) {
        halfDays += r.requestedDays;
      } else if (r.leaveTypeName.includes('병가')) {
        sickDays += r.requestedDays;
      } else {
        otherDays += r.requestedDays;
      }
    });

    const totalDays = Number((annualDays + halfDays + sickDays + otherDays).toFixed(1));

    return {
      month: monthStr,
      '연차': Number(annualDays.toFixed(1)),
      '반차': Number(halfDays.toFixed(1)),
      '병가': Number(sickDays.toFixed(1)),
      '기타 휴가': Number(otherDays.toFixed(1)),
      total: totalDays,
    };
  });

  const totalUsedDaysYear = chartData.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div id="monthly-leave-chart-card" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle || `${selectedYear}년 승인된 휴가 일수 기준`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Top Year Filter (표 상단 년도 필터) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-500 font-medium text-[11px]">년도 필터:</span>
            <select
              id="select-chart-year-filter"
              value={selectedYear}
              onChange={(e) => handleYearSelect(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}년
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-medium">
            {selectedYear}년 총 사용: <strong className="font-bold">{totalUsedDaysYear.toFixed(1)}일</strong>
          </span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
              formatter={(val: any) => [`${val}일`, '']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="연차" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="반차" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
            <Bar dataKey="병가" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
            <Bar dataKey="기타 휴가" stackId="a" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Breakdown Table (표) */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedYear}년 월별 휴가 사용 상세 집계표</span>
          </span>
          <span className="text-[11px] text-slate-400">단위: 일</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2 px-2.5 text-left bg-slate-100/60">구분</th>
                {months.map((m) => (
                  <th key={m} className="py-2 px-1.5 font-medium">{m}월</th>
                ))}
                <th className="py-2 px-2 font-bold text-blue-700 bg-blue-50">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-2.5 text-left font-semibold text-slate-700 bg-slate-50/30">연차</td>
                {chartData.map((d, i) => (
                  <td key={i} className="py-2 px-1.5">{d['연차'] > 0 ? d['연차'] : '-'}</td>
                ))}
                <td className="py-2 px-2 font-bold text-slate-900 bg-blue-50/30">
                  {chartData.reduce((s, c) => s + c['연차'], 0).toFixed(1)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-2.5 text-left font-semibold text-slate-700 bg-slate-50/30">반차</td>
                {chartData.map((d, i) => (
                  <td key={i} className="py-2 px-1.5">{d['반차'] > 0 ? d['반차'] : '-'}</td>
                ))}
                <td className="py-2 px-2 font-bold text-slate-900 bg-blue-50/30">
                  {chartData.reduce((s, c) => s + c['반차'], 0).toFixed(1)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-2.5 text-left font-semibold text-slate-700 bg-slate-50/30">병가</td>
                {chartData.map((d, i) => (
                  <td key={i} className="py-2 px-1.5">{d['병가'] > 0 ? d['병가'] : '-'}</td>
                ))}
                <td className="py-2 px-2 font-bold text-slate-900 bg-blue-50/30">
                  {chartData.reduce((s, c) => s + c['병가'], 0).toFixed(1)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-2.5 text-left font-semibold text-slate-700 bg-slate-50/30">기타 휴가</td>
                {chartData.map((d, i) => (
                  <td key={i} className="py-2 px-1.5">{d['기타 휴가'] > 0 ? d['기타 휴가'] : '-'}</td>
                ))}
                <td className="py-2 px-2 font-bold text-slate-900 bg-blue-50/30">
                  {chartData.reduce((s, c) => s + c['기타 휴가'], 0).toFixed(1)}
                </td>
              </tr>
              <tr className="bg-blue-50/60 font-bold border-t border-blue-200">
                <td className="py-2.5 px-2.5 text-left text-blue-900 font-extrabold">월별 합계</td>
                {chartData.map((d, i) => (
                  <td key={i} className={`py-2.5 px-1.5 ${d.total > 0 ? 'text-blue-700 font-extrabold' : 'text-slate-400'}`}>
                    {d.total > 0 ? d.total : '-'}
                  </td>
                ))}
                <td className="py-2.5 px-2 text-blue-800 bg-blue-100 font-black text-sm">
                  {totalUsedDaysYear.toFixed(1)}일
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
