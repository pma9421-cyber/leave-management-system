import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { LeaveRequest } from '../../types.ts';
import { EditLeaveRequestModal } from '../modals/EditLeaveRequestModal.tsx';
import { DeleteLeaveRequestModal } from '../modals/DeleteLeaveRequestModal.tsx';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Filter,
  Calendar,
  Edit3,
  Trash2,
  Search,
} from 'lucide-react';

interface EmployeeHistoryProps {
  onOpenRequestModal: () => void;
}

export const EmployeeHistory: React.FC<EmployeeHistoryProps> = ({
  onOpenRequestModal,
}) => {
  const { currentUser } = useAuth();
  const { leaveRequests, leaveTypes, deleteLeaveRequest } = useLeave();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit and Delete modals state
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<LeaveRequest | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  if (!currentUser) return null;

  // Filter requests for current user
  const myRequests = useMemo(() => {
    return leaveRequests.filter((r) => r.userId === currentUser.id);
  }, [leaveRequests, currentUser.id]);

  // Filtered list based on status, year, and search query
  const filteredRequests = useMemo(() => {
    return myRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (selectedYearFilter !== 'ALL') {
        const reqYear = new Date(r.startDate).getFullYear().toString();
        if (reqYear !== selectedYearFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchType = r.leaveTypeName.toLowerCase().includes(q);
        const matchDate = r.startDate.includes(q) || r.endDate.includes(q);
        if (!matchType && !matchDate) return false;
      }
      return true;
    });
  }, [myRequests, statusFilter, selectedYearFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              신청 내역 조회
            </span>
            <span className="text-xs text-slate-400">
              {currentUser.name} ({currentUser.position || '사원'})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            휴가 신청 및 사용 내역
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            본인이 신청한 모든 휴가의 승인 및 처리 상태를 확인하고, 대기 중인 신청을 수정 또는 취소할 수 있습니다.
          </p>
        </div>

        <button
          id="btn-history-new-request"
          onClick={onOpenRequestModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>새 휴가 신청하기</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main History Container */}
      <div id="section-emp-leave-history" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Bar: Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>상태:</span>
            </span>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => {
              const labelMap: Record<string, string> = {
                ALL: '전체',
                PENDING: '대기중',
                APPROVED: '승인됨',
                REJECTED: '반려됨',
              };
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  id={`btn-filter-status-${st}`}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {labelMap[st]}
                </button>
              );
            })}
          </div>

          {/* Year & Search Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-500 font-medium text-[11px]">년도:</span>
              <select
                id="select-history-year-filter"
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">전체 년도</option>
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
                <option value="2024">2024년</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="유형명, 날짜 검색..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">해당 조건의 신청 내역이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">상단의 휴가 신청하기 버튼을 눌러 새로운 휴가를 신청하실 수 있습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>승인 대기중</span>
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>승인 완료</span>
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>반려됨</span>
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          <span>취소됨</span>
                        </span>
                      )}

                      {/* Leave Type */}
                      <span className="font-bold text-slate-900 text-sm">{req.leaveTypeName}</span>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                        {req.requestedDays}일
                      </span>
                      <span className="text-xs text-slate-400">신청일: {req.appliedAt}</span>
                    </div>

                    {/* Date Range */}
                    <div className="text-xs text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">
                        {req.startDate} {req.startDate !== req.endDate ? `~ ${req.endDate}` : '(당일)'}
                      </span>
                    </div>

                    {/* Processed Info */}
                    {req.processedAt && (
                      <p className="text-[11px] text-slate-400">
                        처리일시: {req.processedAt} · 처리자: {req.processedBy}
                      </p>
                    )}
                  </div>

                  {/* Right Action: Edit, Delete or Cancel */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                    {req.status === 'PENDING' && (
                      <button
                        id={`btn-emp-edit-${req.id}`}
                        onClick={() => setEditingRequest(req)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
                        title="신청 내용 수정"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>수정</span>
                      </button>
                    )}

                    {(req.status === 'PENDING' || req.status === 'REJECTED' || req.status === 'CANCELLED') && (
                      <button
                        id={`btn-emp-delete-${req.id}`}
                        onClick={() => setDeletingRequest(req)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="신청 내역 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>삭제</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Leave Request Modal */}
      <EditLeaveRequestModal
        request={editingRequest}
        isOpen={!!editingRequest}
        onClose={() => setEditingRequest(null)}
        onSuccess={() => {
          setActionSuccessMsg('휴가 신청 내용이 성공적으로 수정되었습니다.');
          setTimeout(() => setActionSuccessMsg(''), 4000);
        }}
      />

      {/* Delete Leave Request Modal */}
      <DeleteLeaveRequestModal
        request={deletingRequest}
        leaveTypes={leaveTypes}
        isOpen={!!deletingRequest}
        onClose={() => setDeletingRequest(null)}
        onConfirm={() => {
          if (deletingRequest) {
            deleteLeaveRequest(deletingRequest.id);
            setActionSuccessMsg('휴가 신청 내역이 삭제되었습니다.');
            setTimeout(() => setActionSuccessMsg(''), 4000);
            setDeletingRequest(null);
          }
        }}
      />
    </div>
  );
};
