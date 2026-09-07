import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { LeaveRequest } from '../../types.ts';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
} from 'lucide-react';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({ isOpen, onClose }) => {
  const { companyUsers } = useAuth();
  const { leaveRequests } = useLeave();

  const companyUserIds = useMemo(() => new Set(companyUsers.map((u) => u.id)), [companyUsers]);

  // Date range filter (From ~ To)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-12-31`;
  });

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');

  // Quick Range Presets
  const setQuickRange = (type: 'THIS_YEAR' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');

    if (type === 'THIS_YEAR') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (type === 'THIS_MONTH') {
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (type === 'LAST_3_MONTHS') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Filter leave requests based on date range, status, and company scope
  const filteredData = useMemo(() => {
    return leaveRequests.filter((req) => {
      // Must belong to the same company
      if (!companyUserIds.has(req.userId)) return false;

      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }

      // Date range filter (overlap check: req.startDate <= endDate && req.endDate >= startDate)
      if (startDate && req.endDate < startDate) return false;
      if (endDate && req.startDate > endDate) return false;

      return true;
    });
  }, [leaveRequests, companyUserIds, startDate, endDate, statusFilter]);

  // Total days in filtered data
  const totalDays = useMemo(() => {
    return filteredData.reduce((sum, r) => sum + r.requestedDays, 0);
  }, [filteredData]);

  // Generate and download Excel-compatible CSV file with UTF-8 BOM
  const handleDownloadExcel = () => {
    if (filteredData.length === 0) {
      alert('다운로드할 휴가 내역이 존재하지 않습니다.');
      return;
    }

    // CSV Header row: Must include 직원 이름, 휴가일, 휴가일수
    const headers = [
      '직원 이름',
      '직급',
      '휴가일 (기간)',
      '휴가일수',
      '휴가 종류',
      '결재 상태',
      '신청일시',
      '처리자/승인자',
      '처리일시',
    ];

    const rows = filteredData.map((r) => {
      const datePeriod = r.startDate === r.endDate ? r.startDate : `${r.startDate} ~ ${r.endDate}`;
      const statusText =
        r.status === 'APPROVED' ? '승인완료' : r.status === 'PENDING' ? '승인대기' : '반려';

      return [
        `"${(r.userName || '').replace(/"/g, '""')}"`,
        `"${(r.userPosition || '사원').replace(/"/g, '""')}"`,
        `"${datePeriod}"`,
        `"${r.requestedDays}일"`,
        `"${(r.leaveTypeName || '').replace(/"/g, '""')}"`,
        `"${statusText}"`,
        `"${r.appliedAt || ''}"`,
        `"${(r.processedBy || '-').replace(/"/g, '""')}"`,
        `"${r.processedAt || '-'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    // Add UTF-8 BOM (\uFEFF) so Excel opens Korean characters correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanStart = startDate.replace(/-/g, '');
    const cleanEnd = endDate.replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `휴가신청내역_백업_${cleanStart}_${cleanEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="excel-export-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm sm:max-w-lg md:max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                휴가 내역 엑셀 백업 및 다운로드
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                기간(시작일~종료일)을 지정하여 직원 이름, 휴가일, 휴가일수가 포함된 엑셀(CSV) 파일을 백업합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Filter Card */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>기간 설정 (From ~ To)</span>
              </span>

              {/* Quick range presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuickRange('THIS_YEAR')}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  올해
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('THIS_MONTH')}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  이번 달
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('LAST_3_MONTHS')}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  최근 3개월
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('ALL')}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  전체 기간
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  시작일 (From)
                </label>
                <input
                  id="input-excel-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  종료일 (To)
                </label>
                <input
                  id="input-excel-end-date"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
              <span className="font-semibold text-slate-700">결재 상태 필터</span>
              <div className="flex items-center gap-1.5">
                {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map((s) => {
                  const label =
                    s === 'ALL'
                      ? '전체'
                      : s === 'APPROVED'
                      ? '승인완료만'
                      : s === 'PENDING'
                      ? '대기만'
                      : '반려만';
                  const isSel = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                        isSel
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export Items Checklist Card */}
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>엑셀 파일 포함 항목 (기재 내역)</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                MS Excel · 한글오피스 완벽 호환 (UTF-8 BOM)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 text-[11px]">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <strong>직원 이름</strong> (필수)
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <strong>휴가일 (기간)</strong> (필수)
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <strong>휴가일수</strong> (필수)
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>직급 / 휴가종류</span>
              </div>
            </div>
          </div>

          {/* Filtered Count & Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                다운로드 대상 내역 미리보기 ({filteredData.length}건 / 총 {totalDays}일)
              </span>
              <span className="text-[11px] text-slate-500">
                선택 기간: {startDate} ~ {endDate}
              </span>
            </div>

            {filteredData.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500">선택한 기간 및 조건에 해당하는 휴가 내역이 없습니다.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  기간을 넓히거나 상태 필터를 '전체'로 변경해 보세요.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">직원 이름</th>
                      <th className="py-2 px-3">직급</th>
                      <th className="py-2 px-3">휴가일</th>
                      <th className="py-2 px-3 text-center">휴가일수</th>
                      <th className="py-2 px-3">휴가 종류</th>
                      <th className="py-2 px-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.userName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.userPosition || '사원'}</td>
                        <td className="py-2 px-3 text-slate-700">
                          {item.startDate === item.endDate
                            ? item.startDate
                            : `${item.startDate} ~ ${item.endDate}`}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">
                          {item.requestedDays}일
                        </td>
                        <td className="py-2 px-3 text-slate-700">{item.leaveTypeName}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.status === 'APPROVED'
                              ? '승인완료'
                              : item.status === 'PENDING'
                              ? '대기'
                              : '반려'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="text-xs text-slate-500">
            총 <strong className="text-slate-900 font-bold">{filteredData.length}건</strong> 추출 준비 완료
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              id="btn-confirm-excel-download"
              type="button"
              onClick={handleDownloadExcel}
              disabled={filteredData.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀 파일(.csv) 다운로드</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
