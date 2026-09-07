import React from 'react';
import { AuditLog, AuditLogActionType } from '../../types.ts';
import {
  X,
  Shield,
  User,
  Clock,
  Globe,
  ArrowRight,
  FileText,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  Settings,
  Calendar,
  Layers,
  Copy,
} from 'lucide-react';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !log) return null;

  const getActionBadge = (type: AuditLogActionType) => {
    switch (type) {
      case 'ACCOUNT_CREATE':
        return {
          label: '계정 생성',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: UserCheck,
        };
      case 'ROLE_CHANGE':
        return {
          label: '권한 변경',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Shield,
        };
      case 'PROFILE_UPDATE':
        return {
          label: '정보 수정',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Settings,
        };
      case 'STATUS_CHANGE':
        return {
          label: '상태 변경/승인',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: AlertTriangle,
        };
      case 'LOGIN':
        return {
          label: '로그인',
          bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          icon: LogIn,
        };
      case 'LOGOUT':
        return {
          label: '로그아웃',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: LogOut,
        };
      case 'QUOTA_CHANGE':
        return {
          label: '연차 조정',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: Calendar,
        };
      case 'PASSWORD_RESET':
        return {
          label: '비밀번호 변경',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: Shield,
        };
      case 'YEAR_TRANSITION':
        return {
          label: '연도 전환/이월',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: Calendar,
        };
      case 'QUOTA_GRANT':
        return {
          label: '신규 연차 부여',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          icon: Calendar,
        };
      case 'LEAVE_DEDUCTION':
        return {
          label: '연차 차감',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: Calendar,
        };
      case 'LEAVE_APPLY':
        return {
          label: '휴가 신청',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: FileText,
        };
      case 'LEAVE_APPROVE':
        return {
          label: '결재 승인',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: UserCheck,
        };
      case 'LEAVE_REJECT':
        return {
          label: '결재 반려',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
        };
      case 'LEAVE_CANCEL':
        return {
          label: '휴가 취소',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: FileText,
        };
      default:
        return {
          label: type,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: FileText,
        };
    }
  };

  const badgeInfo = getActionBadge(log.actionType);
  const BadgeIcon = badgeInfo.icon;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(log.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="modal-audit-log-detail"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeInfo.bg}`}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{badgeInfo.label}</span>
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {log.actionTitle}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                <span className="font-mono">{log.id}</span>
                <button
                  onClick={handleCopyId}
                  title="로그 ID 복사"
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3 inline" />
                  {copied && <span className="text-[10px] text-emerald-600 ml-1">복사됨!</span>}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target Account Overview Card */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                대상 계정 정보
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  log.userRole === 'ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {log.userRole === 'ADMIN' ? '관리자 (ADMIN)' : '직원 (EMPLOYEE)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">이름</span>
                <span className="font-semibold text-slate-800">{log.userName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">이메일</span>
                <span className="font-mono text-slate-800 text-[11px] truncate block" title={log.userEmail}>
                  {log.userEmail}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">소속 부서</span>
                <span className="font-medium text-slate-700">{log.userDepartment || '-'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">직급</span>
                <span className="font-medium text-slate-700">{log.userPosition || '-'}</span>
              </div>
            </div>
          </div>

          {/* Action Details & Operator Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                작업 일시
              </span>
              <span className="font-semibold text-slate-900 font-mono text-xs block">
                {log.timestamp}
              </span>
              <p className="text-[11px] text-slate-400">정확한 시스템 기록 시각 (KST)</p>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-500" />
                작업 수행자 (Operator)
              </span>
              <span className="font-semibold text-slate-900 text-xs block">
                {log.operatorName}
              </span>
              <span className="text-[11px] text-slate-400 block">
                구분: {log.operatorRole === 'ADMIN' ? '관리자 권한 처리' : log.operatorRole === 'SYSTEM' ? '시스템 자동 처리' : '사용자 본인 직접 수행'}
              </span>
            </div>
          </div>

          {/* Detailed description */}
          {log.details && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-900 block">작업 내용 상세 요약</span>
              <p className="text-slate-700 leading-relaxed">{log.details}</p>
            </div>
          )}

          {/* Before vs After Diff Section */}
          {log.diff && log.diff.fields && log.diff.fields.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  변경 전 / 후 상세 내역 비교 (Before vs After)
                </h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                      <th className="py-2.5 px-3.5 w-1/3">변경 항목</th>
                      <th className="py-2.5 px-3.5 w-1/3 text-rose-700 bg-rose-50/50">
                        변경 전 (Before)
                      </th>
                      <th className="py-2.5 px-3.5 w-1/3 text-emerald-700 bg-emerald-50/50">
                        변경 후 (After)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {log.diff.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3.5 font-semibold text-slate-700">
                          {f.label}
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {f.key}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 bg-rose-50/20 font-medium">
                          <span className="inline-block px-2 py-1 rounded bg-rose-100/70 text-rose-800 text-xs border border-rose-200">
                            {String(f.before)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-800 bg-emerald-50/20 font-medium">
                          <div className="flex items-center gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="inline-block px-2 py-1 rounded bg-emerald-100/70 text-emerald-900 text-xs font-bold border border-emerald-200">
                              {String(f.after)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
              <span>별도의 변경 전/후 필드 변경이 없는 단순 접속/기록 이벤트입니다.</span>
            </div>
          )}

          {/* Network & Access Environment Information */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              접속 및 보안 환경 정보
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">접속 IP 주소</span>
                <span className="font-mono font-semibold text-slate-800">{log.ipAddress}</span>
              </div>
              <div>
                <span className="text-slate-400 block">접속 환경 (User-Agent)</span>
                <span
                  className="text-slate-600 truncate block font-mono text-[10px]"
                  title={log.userAgent || '브라우저 정보 없음'}
                >
                  {log.userAgent || '기본 브라우저 웹 클라이언트'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
