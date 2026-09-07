export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';
export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';

export const isAnyAdmin = (role?: UserRole): boolean => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const isSuperAdmin = (role?: UserRole): boolean => role === 'SUPER_ADMIN';
export const isCompanyAdmin = (role?: UserRole): boolean => role === 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  businessNumber: string; // 회사 사업자번호 (예: 123-45-67890)
  companyName?: string;   // 회사명
  department?: string;
  position: string;
  joinedDate: string;
  avatarUrl?: string;

  // 연차 상세 구성 (요청 4: 법정연차, 이월연차, 보상연차)
  statutoryLeaveDays?: number;    // 법정연차 (근로기준법 기준 기본 부여분, 예: 15일)
  carriedOverLeaveDays?: number;  // 이월연차 (전년도 잔여 연차 이월분: 양수 또는 음수 모두 가능)
  compensatoryLeaveDays?: number; // 보상연차 (연장/야간/휴일근로 보상휴가 또는 포상휴가)

  totalLeaveDays: number; // 총 부여된 연차 = statutoryLeaveDays + carriedOverLeaveDays + compensatoryLeaveDays
  usedLeaveDays: number;  // 승인되어 사용된 연차
  // 남은 연차 = totalLeaveDays - usedLeaveDays (음수/마이너스 표기 지원)
  status: AccountStatus;  // 가입 승인 상태 (ADMIN은 즉시 APPROVED, EMPLOYEE는 PENDING 후 관리자 승인)
  password?: string;      // 계정 비밀번호
  tempPassword?: string;  // admin이 발급한 임시 비밀번호
  requirePasswordChange?: boolean; // 임시 비밀번호 로그인 후 새 비밀번호 등록 필요 여부
  annualQuotas?: Record<number, UserYearQuota>; // 회계연도별 연차 원장
}

export interface UserYearQuota {
  year: number;
  statutoryLeaveDays?: number;    // 법정연차
  carriedOverLeaveDays?: number;  // 이월연차 (음수/양수 모두 가능)
  compensatoryLeaveDays?: number; // 보상연차
  baseQuota?: number;
  carryOverDays?: number;
  expiredDays?: number;
  adjustedDays?: number;
  totalLeaveDays: number;        // 총 연차 = statutoryLeaveDays + carriedOverLeaveDays + compensatoryLeaveDays
  usedLeaveDays: number;         // 당해연도 사용 연차
}

export interface YearTransitionPolicy {
  businessNumber: string;
  allowCarryOver: boolean;       // 미사용 연차 이월 허용 여부 (true: 이월, false: 전액 소멸)
  maxCarryOverDays: number;      // 최대 이월 가능 한도 일수 (예: 5일, 0이면 무제한)
  defaultNewQuota: number;       // 신규 연도 기본 부여 연차 (예: 15일)
  expireRemaining: boolean;      // 이월 초과분/미허용분 소멸 처리 여부 (true)
  lastTransitionAt?: string;     // 마지막 연도 전환 일시 (예: "2027-01-01 00:00:00")
  isTransitionCompleted?: boolean; // 2027년도 전환 완료 여부
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessNumber: string;
  userRole: UserRole;
  requestedAt: string;
  status: 'PENDING' | 'ISSUED' | 'COMPLETED' | 'REJECTED';
  tempPassword?: string; // 발급된 임시 번호
  issuedAt?: string;
  issuedBy?: string;     // 발급 관리자명
  completedAt?: string;  // 새 비밀번호 변경 완료 일시
}

export interface BusinessAdminLimit {
  businessNumber: string;
  companyName?: string;
  maxAdminCount: number; // 기본값 1
  updatedAt: string;
  updatedBy: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string; // e.g., 'ANNUAL', 'HALF_AM', 'HALF_PM', 'SICK', 'SPECIAL', etc.
  deductionDays: number; // e.g. 1.0, 0.5, 0.0
  isPaid: boolean;
  description: string;
  color: string;
  isActive: boolean;
  isCustom?: boolean;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userDepartment?: string;
  userPosition: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string;
  status: LeaveStatus;
  appliedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface QuotaAdjustmentLog {
  id: string;
  userId: string;
  adminId: string;
  adminName: string;
  previousDays: number;
  newDays: number;
  reason?: string;
  adjustedAt: string;
}

export type AuditLogActionType =
  | 'ACCOUNT_CREATE'   // 계정 생성 / 신규 가입
  | 'ACCOUNT_DELETE'   // 계정 삭제
  | 'PROFILE_UPDATE'   // 정보 수정 (부서, 직급, 입사일 등)
  | 'ROLE_CHANGE'      // 권한 변경 (SUPER_ADMIN / ADMIN / EMPLOYEE)
  | 'STATUS_CHANGE'    // 상태 변경 (가입 승인, 반려, 활성화, 비활성화)
  | 'LOGIN'            // 로그인
  | 'LOGOUT'           // 로그아웃
  | 'QUOTA_CHANGE'     // 연차 일수 변경
  | 'PASSWORD_RESET'   // 비밀번호 변경
  | 'YEAR_TRANSITION'  // 연도 전환 처리 (이월/소멸)
  | 'QUOTA_GRANT'      // 신규 연차 부여
  | 'LEAVE_DEDUCTION'  // 연차 차감
  | 'LEAVE_APPLY'      // 연차 신청
  | 'LEAVE_APPROVE'    // 연차 결재 승인
  | 'LEAVE_REJECT'     // 연차 결재 반려
  | 'LEAVE_CANCEL';    // 연차 결재 취소/환원

export interface AuditLogDiffField {
  label: string;
  key: string;
  before: string | number | boolean;
  after: string | number | boolean;
}

export interface AuditLog {
  id: string;
  actionType: AuditLogActionType;
  actionTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment?: string;
  userPosition?: string;
  userRole: UserRole;
  operatorId: string;
  operatorName: string;
  operatorRole?: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  ipAddress: string;
  userAgent?: string;
  details?: string;
  diff?: {
    fields: AuditLogDiffField[];
  };
}

export interface AuditLogFilterParams {
  search?: string;
  actionType?: AuditLogActionType | 'ALL';
  department?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp';
  sortOrder?: 'desc' | 'asc';
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    totalLogs: number;
    todayLogs: number;
    securityEvents: number;
    loginEvents: number;
  };
}
