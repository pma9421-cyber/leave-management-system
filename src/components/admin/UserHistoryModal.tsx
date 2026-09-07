import React, { useMemo } from 'react';
import { User, AuditLogActionType } from '../../types.ts';
import { useAuditLog } from '../../context/AuditLogContext.tsx';
import {
  X,
  History,
  Clock,
  User as UserIcon,
  Shield,
  KeyRound,
  ArrowRight,
  LogIn,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface UserHistoryModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { logs } = useAuditLog();

  const userLogs = useMemo(() => {
    if (!user) return [];
    return logs
      .filter((l) => l.userId === user.id || l.userEmail.toLowerCase() === user.email.toLowerCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, user]);

  if (!isOpen || !user) return null;

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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">연차 조정</span>;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {user.name} 계정 상세 이력
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  {user.role}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {user.businessNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.email} · {user.department || '-'} / {user.position}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span>총 {userLogs.length}건의 계정 활동 및 감사 기록</span>
            <span>최신순 정렬</span>
          </div>

          {userLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">기록된 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.actionType)}
                      <span className="text-sm font-bold text-slate-900">
                        {log.actionTitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {log.details || '상세 내용 없음'}
                  </p>

                  {/* Diff Fields if any */}
                  {log.diff?.fields && log.diff.fields.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-700 mb-1">변경 데이터 내역:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {log.diff.fields.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-slate-200/60">
                            <span className="text-slate-500 font-medium shrink-0">[{f.label}]</span>
                            <span className="text-slate-500 line-through truncate max-w-[80px]">{String(f.before)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-blue-700 font-bold truncate">{String(f.after)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>작업자: <strong className="text-slate-700">{log.operatorName}</strong> ({log.operatorRole || 'ADMIN'})</span>
                    <span className="font-mono">IP: {log.ipAddress}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
