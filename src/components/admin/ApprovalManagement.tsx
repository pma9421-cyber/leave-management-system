import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLeave } from '../../context/LeaveContext.tsx';
import { LeaveRequest } from '../../types.ts';
import { calculateLeaveDeduction } from '../../utils/leaveUtils.ts';
import { EditLeaveRequestModal } from '../modals/EditLeaveRequestModal.tsx';
import { DeleteLeaveRequestModal } from '../modals/DeleteLeaveRequestModal.tsx';
import { AdminProxyLeaveModal } from './AdminProxyLeaveModal.tsx';
import { ExcelExportModal } from './ExcelExportModal.tsx';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Search,
  Check,
  X,
  Edit3,
  Trash2,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

export const ApprovalManagement: React.FC = () => {
  const { companyUsers } = useAuth();
  const {
    leaveRequests,
    leaveTypes,
    approveLeaveRequest,
    rejectLeaveRequest,
    deleteLeaveRequest,
  } = useLeave();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Proxy Leave
  const [isProxyLeaveModalOpen, setIsProxyLeaveModalOpen] = useState(false);

  // Edit and Delete modal states
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<LeaveRequest | null>(null);

  // Rejection modal state
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
  const [rejectionError, setRejectionError] = useState('');

  // Success toast state
  const [successMsg, setSuccessMsg] = useState<string>('');

  const companyUserIds = useMemo(() => new Set(companyUsers.map((u) => u.id)), [companyUsers]);

  const companyRequests = useMemo(() => {
    return leaveRequests.filter((r) => companyUserIds.has(r.userId));
  }, [leaveRequests, companyUserIds]);

  const pendingRequests = useMemo(() => {
    return companyRequests.filter((r) => r.status === 'PENDING');
  }, [companyRequests]);

  const processedRequests = useMemo(() => {
    return companyRequests.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED');
  }, [companyRequests]);

  const displayedRequests = useMemo(() => {
    const list = activeTab === 'PENDING' ? pendingRequests : processedRequests;
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        (r.userPosition && r.userPosition.toLowerCase().includes(q)) ||
        r.leaveTypeName.toLowerCase().includes(q)
    );
  }, [activeTab, pendingRequests, processedRequests, searchQuery]);

  const handleApprove = (req: LeaveRequest) => {
    const leaveType = leaveTypes.find((t) => t.id === req.leaveTypeId);
    const deduction = calculateLeaveDeduction(leaveType, req.requestedDays);

    const res = approveLeaveRequest(req.id);
    if (res.success) {
      setSuccessMsg(
        `${req.userName}님의 ${req.leaveTypeName} ${req.requestedDays}일 신청이 승인되었습니다. (연차 ${deduction}일 차감 반영)`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleOpenRejectModal = (req: LeaveRequest) => {
    setRejectingRequest(req);
    setRejectionError('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    const res = rejectLeaveRequest(rejectingRequest.id);
    if (res.success) {
      setRejectingRequest(null);
      setSuccessMsg(`${rejectingRequest.userName}님의 신청이 반려 처리되었습니다.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setRejectionError(res.error || '반려 처리에 실패했습니다.');
    }
  };

  const handleOpenEditModal = (req: LeaveRequest) => {
    setEditingRequest(req);
  };

  const handleOpenDeleteModal = (req: LeaveRequest) => {
    setDeletingRequest(req);
  };

  const handleConfirmDelete = () => {
    if (!deletingRequest) return;
    const res = deleteLeaveRequest(deletingRequest.id);
    if (res.success) {
      setSuccessMsg(`${deletingRequest.userName}님의 휴가 신청 내역이 삭제되었습니다.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setDeletingRequest(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            휴가 신청 승인 관리
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            직원들이 제출한 휴가 신청서를 검토하고 승인 또는 반려 처리합니다. 승인 시 잔여 연차가 자동 차감됩니다.
          </p>
        </div>

        {/* Actions & Tab switcher */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-approval-proxy-leave"
            onClick={() => setIsProxyLeaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>대리 휴가 신청</span>
          </button>

          {/* Tab switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="tab-approvals-pending"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>승인 대기</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-white font-extrabold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              id="tab-approvals-processed"
              onClick={() => setActiveTab('PROCESSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PROCESSED'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              처리 완료 내역
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="직원 이름, 직급, 휴가 종류 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <span className="text-xs text-slate-500">
          총 <strong>{displayedRequests.length}</strong>건
        </span>
      </div>

      {/* Request Cards List */}
      {displayedRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {activeTab === 'PENDING' ? '현재 대기 중인 휴가 신청이 없습니다.' : '처리 완료 내역이 없습니다.'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'PENDING'
              ? '직원이 새 휴가를 신청하면 이곳에 실시간으로 표시됩니다.'
              : '승인 또는 반려된 신청 건들이 기록됩니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRequests.map((req) => {
            const leaveType = leaveTypes.find((t) => t.id === req.leaveTypeId);
            const deduction = calculateLeaveDeduction(leaveType, req.requestedDays);

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                        <User className="w-4 h-4 text-blue-600" />
                        <span>{req.userName}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        ({req.userPosition || '사원'})
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {req.leaveTypeName}
                      </span>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        신청 {req.requestedDays}일 {deduction > 0 ? `(차감 ${deduction}일)` : '(미차감)'}
                      </span>
                      <span className="text-[11px] text-slate-400">신청일: {req.appliedAt}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">
                        {req.startDate} {req.startDate !== req.endDate ? `~ ${req.endDate}` : '(당일)'}
                      </span>
                    </div>

                    {/* Processed status if not pending */}
                    {req.status === 'APPROVED' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>승인 완료 ({req.processedAt} · {req.processedBy})</span>
                      </div>
                    )}

                    {req.status === 'REJECTED' && (
                      <div className="p-2.5 rounded-md bg-rose-50 border border-rose-100 text-xs text-rose-800">
                        <div className="flex items-center gap-1 font-bold text-rose-900">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>반려 처리됨 ({req.processedAt})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0 flex-wrap">
                    {/* Edit button */}
                    <button
                      id={`btn-edit-${req.id}`}
                      onClick={() => handleOpenEditModal(req)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="신청 내역 수정"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>수정</span>
                    </button>

                    {/* Pending specific action buttons: Reject & Approve */}
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          id={`btn-reject-${req.id}`}
                          onClick={() => handleOpenRejectModal(req)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>반려</span>
                        </button>
                        <button
                          id={`btn-approve-${req.id}`}
                          onClick={() => handleApprove(req)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>승인하기</span>
                        </button>
                      </>
                    )}

                    {/* Delete button */}
                    <button
                      id={`btn-delete-${req.id}`}
                      onClick={() => handleOpenDeleteModal(req)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                      title="신청 내역 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Leave Request Modal */}
      <EditLeaveRequestModal
        request={editingRequest}
        isOpen={!!editingRequest}
        onClose={() => setEditingRequest(null)}
        onSuccess={() => {
          setSuccessMsg('휴가 신청 내역이 성공적으로 수정되었습니다.');
          setTimeout(() => setSuccessMsg(''), 4000);
        }}
      />

      {/* Delete Leave Request Modal */}
      <DeleteLeaveRequestModal
        request={deletingRequest}
        leaveTypes={leaveTypes}
        isOpen={!!deletingRequest}
        onClose={() => setDeletingRequest(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Rejection Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/40">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>휴가 신청 반려</span>
              </div>
              <button
                onClick={() => setRejectingRequest(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
              {rejectionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {rejectionError}
                </div>
              )}

              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <p>
                  <strong>신청자:</strong> {rejectingRequest.userName} ({rejectingRequest.userPosition || '사원'})
                </p>
                <p>
                  <strong>휴가:</strong> {rejectingRequest.leaveTypeName} ({rejectingRequest.startDate} ~ {rejectingRequest.endDate})
                </p>
                <p>
                  <strong>신청 일수:</strong> {rejectingRequest.requestedDays}일
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                해당 직원의 휴가 신청을 반려 처리하시겠습니까?
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  id="btn-confirm-reject"
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  반려 확정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Proxy Leave Modal */}
      <AdminProxyLeaveModal
        isOpen={isProxyLeaveModalOpen}
        onClose={() => setIsProxyLeaveModalOpen(false)}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          setTimeout(() => setSuccessMsg(''), 4000);
        }}
      />
    </div>
  );
};
