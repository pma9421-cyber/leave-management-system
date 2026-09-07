import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  UserRole,
  AccountStatus,
  PasswordResetRequest,
  BusinessAdminLimit,
  UserYearQuota,
  YearTransitionPolicy,
} from '../types.ts';
import { INITIAL_USERS } from '../data/initialData.ts';
import { useAuditLogSafe } from './AuditLogContext.tsx';

export const normalizeBizNum = (num?: string): string => {
  return (num || '').replace(/\D/g, '');
};

export const formatBizNum = (num?: string): string => {
  const digits = (num || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  companyUsers: User[];
  login: (email: string, password?: string, businessNumber?: string) => { success: boolean; error?: string };
  register: (data: {
    email: string;
    name: string;
    businessNumber: string;
    companyName?: string;
    department?: string;
    position?: string;
    role: UserRole;
    totalLeaveDays?: number;
    password?: string;
  }) => { success: boolean; error?: string; isPending?: boolean };
  logout: () => void;
  switchUser: (userId: string) => void;
  updateUserQuota: (userId: string, newTotalDays: number, year?: number) => void;
  updateUserLeaveBreakdown: (
    userId: string,
    statutory: number,
    carried: number,
    compensatory: number,
    year?: number
  ) => void;
  rolloverLeaveToNextYear: (userId?: string, nextYear?: number) => { success: boolean; message?: string };
  updateUserUsedDays: (userId: string, additionalDays: number, year?: number) => void;
  getUserQuota: (userId: string, year?: number) => UserYearQuota;
  yearTransitionPolicy: YearTransitionPolicy;
  updateYearTransitionPolicy: (policy: Partial<YearTransitionPolicy>) => void;
  executeYearTransition: (customConfig?: Partial<YearTransitionPolicy>) => {
    success: boolean;
    error?: string;
    summary?: {
      processedCount: number;
      totalCarryOver: number;
      totalExpired: number;
      totalNewGranted: number;
    };
  };
  resetYearTransition: () => void;
  updateUserPosition: (userId: string, newPosition: string) => void;
  updateUserRole: (userId: string, newRole: UserRole) => { success: boolean; error?: string };
  approveUser: (userId: string) => { success: boolean; message?: string };
  rejectUser: (userId: string) => { success: boolean; message?: string };
  createUser: (data: {
    email: string;
    name: string;
    businessNumber: string;
    companyName?: string;
    department?: string;
    position?: string;
    role: UserRole;
    totalLeaveDays?: number;
    status?: AccountStatus;
    password?: string;
  }) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
  toggleUserStatus: (userId: string, status: AccountStatus) => { success: boolean; error?: string };
  updateEmployee: (
    userId: string,
    data: {
      position?: string;
      joinedDate?: string;
      department?: string;
      totalLeaveDays?: number;
      name?: string;
      email?: string;
      businessNumber?: string;
      companyName?: string;
      role?: UserRole;
      status?: AccountStatus;
    }
  ) => { success: boolean; error?: string };

  // Password reset feature
  passwordResetRequests: PasswordResetRequest[];
  requestPasswordReset: (businessNumber: string, email: string, name: string) => { success: boolean; error?: string; requestId?: string };
  issueTempPassword: (requestId: string, customTempPw?: string) => { success: boolean; tempPassword?: string; error?: string };
  completePasswordChange: (userId: string, newPassword: string) => { success: boolean; error?: string };
  resetPasswordDirect: (businessNumber: string, email: string, tempPassword: string, newPassword: string) => { success: boolean; error?: string };

  // Business admin limits
  businessAdminLimits: BusinessAdminLimit[];
  getBusinessAdminLimit: (businessNumber: string) => number;
  setBusinessAdminLimit: (businessNumber: string, maxLimit: number, companyName?: string) => { success: boolean; error?: string };
  updateCompanyName: (businessNumber: string, newCompanyName: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'leave_app_users_prod_v1';
const CURRENT_USER_KEY = 'leave_app_session_user_id_prod_v1';
const PW_RESETS_KEY = 'leave_app_pw_resets_prod_v1';
const BIZ_LIMITS_KEY = 'leave_app_biz_limits_prod_v1';
const YEAR_POLICY_KEY = 'leave_app_year_policy_prod_v1';

export const DEFAULT_YEAR_POLICY: YearTransitionPolicy = {
  businessNumber: '999-99-99999',
  allowCarryOver: true,
  maxCarryOverDays: 5,
  defaultNewQuota: 15,
  expireRemaining: true,
  lastTransitionAt: undefined,
  isTransitionCompleted: false,
};

const INITIAL_PW_RESETS: PasswordResetRequest[] = [];

const INITIAL_BIZ_LIMITS: BusinessAdminLimit[] = [
  {
    businessNumber: '999-99-99999',
    companyName: 'admin',
    maxAdminCount: 1,
    updatedAt: '2024-01-01 09:00:00',
    updatedBy: 'admin',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auditLog = useAuditLogSafe();

  // Users state: keep only the Master Super Admin account on initial production launch
  const [users, setUsers] = useState<User[]>(() => {
    try {
      // Clear legacy storage keys
      [
        'leave_app_users_v1',
        'leave_app_users_v2',
        'leave_app_users_v3',
        'leave_app_users_v4',
        'leave_app_users_v5',
        'leave_app_users_v6',
        'leave_app_users_v7',
        'leave_app_users_v8',
        'leave_app_users_v9',
        'leave_app_users_v10',
        'leave_app_pw_resets_v1',
        'leave_app_pw_resets_v2',
        'leave_app_pw_resets_v3',
      ].forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
      });

      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
  return parsed;
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }
    return INITIAL_USERS;
  });

  // Current logged in user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      const savedId = sessionStorage.getItem(CURRENT_USER_KEY);
      if (savedId) {
        return savedId;
      }
    } catch (e) {
      console.error('Failed to load current user ID', e);
    }
    // Default to null (unauthenticated, requires login)
    return null;
  });

  // Password reset requests
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>(() => {
    try {
      const saved = localStorage.getItem(PW_RESETS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load password reset requests', e);
    }
    return INITIAL_PW_RESETS;
  });

  // Business admin limits
  const [businessAdminLimits, setBusinessAdminLimits] = useState<BusinessAdminLimit[]>(() => {
    try {
      const saved = localStorage.getItem(BIZ_LIMITS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load business admin limits', e);
    }
    return INITIAL_BIZ_LIMITS;
  });

  // Save users
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }, [users]);

  // Save session user
  useEffect(() => {
    try {
      if (currentUserId) {
        sessionStorage.setItem(CURRENT_USER_KEY, currentUserId);
      } else {
        sessionStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (e) {
      console.error('Failed to save current user ID', e);
    }
  }, [currentUserId]);

  // Save password resets
  useEffect(() => {
    try {
      localStorage.setItem(PW_RESETS_KEY, JSON.stringify(passwordResetRequests));
    } catch (e) {
      console.error('Failed to save password resets', e);
    }
  }, [passwordResetRequests]);

  // Save business limits
  useEffect(() => {
    try {
      localStorage.setItem(BIZ_LIMITS_KEY, JSON.stringify(businessAdminLimits));
    } catch (e) {
      console.error('Failed to save business limits', e);
    }
  }, [businessAdminLimits]);

  // Year transition policy state
  const [yearTransitionPolicy, setYearTransitionPolicy] = useState<YearTransitionPolicy>(() => {
    try {
      const saved = localStorage.getItem(YEAR_POLICY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load year transition policy', e);
    }
    return DEFAULT_YEAR_POLICY;
  });

  useEffect(() => {
    try {
      localStorage.setItem(YEAR_POLICY_KEY, JSON.stringify(yearTransitionPolicy));
    } catch (e) {
      console.error('Failed to save year transition policy', e);
    }
  }, [yearTransitionPolicy]);

  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  const isAuthenticated = !!currentUser;

  // Filter users:
  // Company scope only sees accounts sharing the exact same businessNumber.
  const companyUsers = useMemo(() => {
    if (!currentUser) return [];
    const currentBiz = normalizeBizNum(currentUser.businessNumber);
    return users.filter((u) => normalizeBizNum(u.businessNumber) === currentBiz);
  }, [users, currentUser]);

  // Helper to query max admin quota for a business
  const getBusinessAdminLimit = (businessNumber: string): number => {
    const norm = normalizeBizNum(businessNumber);
    const found = businessAdminLimits.find((b) => normalizeBizNum(b.businessNumber) === norm);
    return found ? found.maxAdminCount : 1; // Default 1
  };

  // Helper to set max admin quota for a business (Super Admin only)
  const setBusinessAdminLimit = (
    businessNumber: string,
    maxLimit: number,
    companyName?: string
  ): { success: boolean; error?: string } => {
    if (maxLimit < 1) {
      return { success: false, error: '관리자 계정 허용 한도는 최소 1개 이상이어야 합니다.' };
    }
    const formatted = formatBizNum(businessNumber);
    const norm = normalizeBizNum(businessNumber);

    const prevLimit = getBusinessAdminLimit(businessNumber);

    setBusinessAdminLimits((prev) => {
      const exists = prev.some((b) => normalizeBizNum(b.businessNumber) === norm);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      if (exists) {
        return prev.map((b) =>
          normalizeBizNum(b.businessNumber) === norm
            ? {
                ...b,
                maxAdminCount: maxLimit,
                companyName: companyName || b.companyName,
                updatedAt: now,
                updatedBy: currentUser?.name || 'admin',
              }
            : b
        );
      } else {
        return [
          ...prev,
          {
            businessNumber: formatted,
            companyName: companyName || '회사',
            maxAdminCount: maxLimit,
            updatedAt: now,
            updatedBy: currentUser?.name || 'admin',
          },
        ];
      }
    });

    auditLog?.addAuditLog({
      actionType: 'QUOTA_CHANGE',
      actionTitle: '사업자번호별 관리자 계정 생성 한도 변경',
      userId: currentUser?.id || 'admin',
      userName: currentUser?.name || 'admin',
      userEmail: currentUser?.email || 'admin@segyotax.com',
      userRole: 'SUPER_ADMIN',
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (최고관리자)` : 'admin (최고관리자)',
      operatorRole: 'SUPER_ADMIN',
      ipAddress: '192.168.1.1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `사업자번호 [${formatted}] 관리자 계정 최대 생성 한도를 ${prevLimit}개에서 ${maxLimit}개로 수정 설정하였습니다.`,
      diff: {
        fields: [
          { label: '사업자등록번호', key: 'businessNumber', before: formatted, after: formatted },
          { label: '관리자 최대 한도', key: 'maxAdminCount', before: `${prevLimit}개`, after: `${maxLimit}개` },
        ],
      },
    });

    return { success: true };
  };

  // Update company name across the business
  const updateCompanyName = (
    businessNumber: string,
    newCompanyName: string
  ): { success: boolean; error?: string } => {
    const trimmedName = newCompanyName.trim();
    if (!trimmedName) {
      return { success: false, error: '회사명을 입력해 주세요.' };
    }

    const formatted = formatBizNum(businessNumber);
    const norm = normalizeBizNum(businessNumber);

    if (!norm || norm.length < 5) {
      return { success: false, error: '유효한 사업자등록번호가 아닙니다.' };
    }

    const prevCompanyName =
      businessAdminLimits.find((b) => normalizeBizNum(b.businessNumber) === norm)?.companyName ||
      users.find((u) => normalizeBizNum(u.businessNumber) === norm)?.companyName ||
      '회사';

    // 1. Update all users belonging to this businessNumber (super admin is always fixed to admin)
    setUsers((prev) =>
      prev.map((u) => {
        if (u.role === 'SUPER_ADMIN' || u.email === 'admin@segyotax.com') {
          return { ...u, companyName: 'admin' };
        }
        if (normalizeBizNum(u.businessNumber) === norm) {
          return { ...u, companyName: trimmedName };
        }
        return u;
      })
    );

    // 2. Update businessAdminLimits
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setBusinessAdminLimits((prev) => {
      const exists = prev.some((b) => normalizeBizNum(b.businessNumber) === norm);
      if (exists) {
        return prev.map((b) =>
          normalizeBizNum(b.businessNumber) === norm
            ? {
                ...b,
                companyName: trimmedName,
                updatedAt: now,
                updatedBy: currentUser?.name || 'admin',
              }
            : b
        );
      } else {
        return [
          ...prev,
          {
            businessNumber: formatted,
            companyName: trimmedName,
            maxAdminCount: 1,
            updatedAt: now,
            updatedBy: currentUser?.name || 'admin',
          },
        ];
      }
    });

    // 3. Record in Audit Log
    auditLog?.addAuditLog({
      actionType: 'PROFILE_UPDATE',
      actionTitle: '사업장 회사명(상호) 변경',
      userId: currentUser?.id || 'admin',
      userName: currentUser?.name || '관리자',
      userEmail: currentUser?.email || 'admin@segyotax.com',
      userDepartment: currentUser?.department || '경영지원본부',
      userPosition: currentUser?.position || '대표',
      userRole: currentUser?.role || 'ADMIN',
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'ADMIN',
      ipAddress: '192.168.1.1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `사업장(사업자등록번호: ${formatted}) 회사명을 '${prevCompanyName}'에서 '${trimmedName}'(으)로 변경하였습니다.`,
      diff: {
        fields: [
          { label: '사업자등록번호', key: 'businessNumber', before: formatted, after: formatted },
          { label: '회사명 (상호)', key: 'companyName', before: prevCompanyName, after: trimmedName },
        ],
      },
    });

    return { success: true };
  };

  // 1. Password reset request by employee or admin (admin cannot be requested this way)
  const requestPasswordReset = (
    businessNumber: string,
    email: string,
    name: string
  ): { success: boolean; error?: string; requestId?: string } => {
    // Handle argument ordering resilience (if email and bizNum are swapped)
    let resolvedBiz = (businessNumber || '').trim();
    let resolvedEmail = (email || '').trim();
    if (resolvedBiz.includes('@') && !resolvedEmail.includes('@')) {
      const temp = resolvedBiz;
      resolvedBiz = resolvedEmail;
      resolvedEmail = temp;
    }

    const trimmedEmail = resolvedEmail.toLowerCase();
    const bizDigits = normalizeBizNum(resolvedBiz);
    const cleanInputName = (name || '').trim().replace(/\s+/g, '');

    if (!trimmedEmail) {
      return { success: false, error: '가입된 회사 이메일을 입력해 주세요.' };
    }
    if (!cleanInputName) {
      return { success: false, error: '가입자 성명을 입력해 주세요.' };
    }

    // 1) First attempt: match by both email and businessNumber digits
    let found = users.find(
      (u) =>
        u.email.trim().toLowerCase() === trimmedEmail &&
        normalizeBizNum(u.businessNumber) === bizDigits
    );

    // 2) Fallback attempt: if business number had spacing/formatting or was omitted, match by email
    if (!found) {
      const emailMatches = users.filter((u) => u.email.trim().toLowerCase() === trimmedEmail);
      if (emailMatches.length === 1) {
        found = emailMatches[0];
      } else if (emailMatches.length > 1 && bizDigits) {
        found = emailMatches.find(
          (u) =>
            normalizeBizNum(u.businessNumber).includes(bizDigits) ||
            bizDigits.includes(normalizeBizNum(u.businessNumber))
        );
      }
    }

    if (!found) {
      return {
        success: false,
        error: `입력하신 사업자번호 및 이메일(${trimmedEmail})과 일치하는 계정을 찾을 수 없습니다. 신규 사용자이신 경우 먼저 [회원가입]을 진행해 주세요.`,
      };
    }

    const foundCleanName = (found.name || '').trim().replace(/\s+/g, '');
    const nameMatches =
      foundCleanName === cleanInputName ||
      foundCleanName.includes(cleanInputName) ||
      cleanInputName.includes(foundCleanName);

    if (!nameMatches) {
      return {
        success: false,
        error: `입력하신 성명(${name.trim()})이 등록된 계정 정보(${found.name})와 일치하지 않습니다.`,
      };
    }

    if (found.role === 'SUPER_ADMIN') {
      return {
        success: false,
        error: '최고 관리자(admin) 계정은 이 경로로 비밀번호를 초기화할 수 없습니다.',
      };
    }

    // Check if there is already a pending request
    const existingPending = passwordResetRequests.find(
      (r) => r.userId === found!.id && r.status === 'PENDING'
    );
    if (existingPending) {
      return {
        success: true,
        requestId: existingPending.id,
        error: '이미 접수된 비밀번호 재설정 신청이 있습니다. 최고 관리자의 임시 비밀번호 발급을 기다려 주세요.',
      };
    }

    const newReq: PasswordResetRequest = {
      id: `pwr-${Date.now()}`,
      userId: found.id,
      userName: found.name,
      userEmail: found.email,
      businessNumber: found.businessNumber,
      userRole: found.role,
      requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'PENDING',
    };

    setPasswordResetRequests((prev) => [newReq, ...prev]);

    auditLog?.addAuditLog({
      actionType: 'PASSWORD_RESET',
      actionTitle: '비밀번호 재설정 신청 접수',
      userId: found.id,
      userName: found.name,
      userEmail: found.email,
      userDepartment: found.department,
      userPosition: found.position,
      userRole: found.role,
      operatorId: found.id,
      operatorName: `${found.name} (신청자)`,
      operatorRole: 'SELF',
      ipAddress: '192.168.1.55',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${found.name} (${found.email}, ${found.role}) 계정에서 비밀번호 재설정을 신청하였습니다. (임시번호 발급 대기중)`,
    });

    return { success: true, requestId: newReq.id };
  };

  // 2. Issue temporary password by SUPER_ADMIN
  const issueTempPassword = (
    requestId: string,
    customTempPw?: string
  ): { success: boolean; tempPassword?: string; error?: string } => {
    const req = passwordResetRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: '신청 내역을 찾을 수 없습니다.' };

    const targetUser = users.find((u) => u.id === req.userId);
    if (!targetUser) return { success: false, error: '해당 사용자를 찾을 수 없습니다.' };

    // Generate random 8-character temporary password if not provided
    const tempPw = customTempPw?.trim() || `temp${Math.floor(100000 + Math.random() * 900000)}!`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Update user
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id
          ? {
              ...u,
              tempPassword: tempPw,
              requirePasswordChange: true,
            }
          : u
      )
    );

    // Update request status
    setPasswordResetRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'ISSUED',
              tempPassword: tempPw,
              issuedAt: now,
              issuedBy: currentUser?.name || 'admin',
            }
          : r
      )
    );

    auditLog?.addAuditLog({
      actionType: 'PASSWORD_RESET',
      actionTitle: '임시 비밀번호 발급 완료',
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      userDepartment: targetUser.department,
      userPosition: targetUser.position,
      userRole: targetUser.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (최고관리자)` : 'admin (최고관리자)',
      operatorRole: 'SUPER_ADMIN',
      ipAddress: '192.168.1.1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `최고 관리자(admin)가 ${targetUser.name} (${targetUser.email}) 계정에 임시 비밀번호를 발급하였습니다. (로그인 후 새 비밀번호 설정 필수)`,
    });

    return { success: true, tempPassword: tempPw };
  };

  // 3. User sets new permanent password after logging in or via reset screen
  const completePasswordChange = (
    userId: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    const trimmedPw = newPassword.trim();
    if (!trimmedPw || trimmedPw.length < 4) {
      return { success: false, error: '새 비밀번호는 최소 4자리 이상이어야 합니다.' };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: '사용자를 찾을 수 없습니다.' };

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              password: trimmedPw,
              tempPassword: undefined,
              requirePasswordChange: false,
            }
          : u
      )
    );

    // Mark any related reset requests as COMPLETED
    setPasswordResetRequests((prev) =>
      prev.map((r) =>
        r.userId === userId && r.status === 'ISSUED'
          ? {
              ...r,
              status: 'COMPLETED',
              completedAt: now,
            }
          : r
      )
    );

    auditLog?.addAuditLog({
      actionType: 'PASSWORD_RESET',
      actionTitle: '새 비밀번호 등록 및 변경 완료',
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      userDepartment: targetUser.department,
      userPosition: targetUser.position,
      userRole: targetUser.role,
      operatorId: targetUser.id,
      operatorName: `${targetUser.name} (본인)`,
      operatorRole: 'SELF',
      ipAddress: '192.168.1.55',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${targetUser.name} 사용자가 발급받은 임시 번호를 통해 안전한 새 비밀번호로 변경을 완료했습니다.`,
    });

    return { success: true };
  };

  // 4. Direct password change on login screen with temp password
  const resetPasswordDirect = (
    businessNumber: string,
    email: string,
    tempPassword: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    // Handle argument ordering resilience (if email and bizNum are swapped)
    let resolvedBiz = (businessNumber || '').trim();
    let resolvedEmail = (email || '').trim();
    if (resolvedBiz.includes('@') && !resolvedEmail.includes('@')) {
      const temp = resolvedBiz;
      resolvedBiz = resolvedEmail;
      resolvedEmail = temp;
    }

    const trimmedEmail = resolvedEmail.toLowerCase();
    const bizDigits = normalizeBizNum(resolvedBiz);
    const trimmedTemp = (tempPassword || '').trim();
    const trimmedNew = (newPassword || '').trim();

    if (!trimmedEmail || !trimmedTemp || !trimmedNew) {
      return { success: false, error: '모든 입력 항목을 기재해 주세요.' };
    }

    if (trimmedNew.length < 4) {
      return { success: false, error: '새 비밀번호는 최소 4자리 이상이어야 합니다.' };
    }

    let found = users.find(
      (u) =>
        u.email.trim().toLowerCase() === trimmedEmail &&
        normalizeBizNum(u.businessNumber) === bizDigits
    );

    if (!found) {
      const byEmail = users.filter((u) => u.email.trim().toLowerCase() === trimmedEmail);
      if (byEmail.length === 1) {
        found = byEmail[0];
      }
    }

    if (!found) {
      return { success: false, error: '일치하는 계정을 찾을 수 없습니다.' };
    }

    // Verify temp password
    const reqWithTemp = passwordResetRequests.find(
      (r) => r.userId === found!.id && r.status === 'ISSUED' && r.tempPassword === trimmedTemp
    );
    const matchesUserTemp = found.tempPassword && found.tempPassword === trimmedTemp;

    if (!matchesUserTemp && !reqWithTemp) {
      return { success: false, error: '발급된 임시 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' };
    }

    const res = completePasswordChange(found.id, trimmedNew);
    if (res.success) {
      // Auto log in
      setCurrentUserId(found.id);
    }
    return res;
  };

  const login = (email: string, password?: string, businessNumber?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const inputBizDigits = businessNumber ? normalizeBizNum(businessNumber) : '';

    let found: User | undefined;

    if (inputBizDigits) {
      found = users.find(
        (u) =>
          u.email.toLowerCase() === trimmedEmail &&
          normalizeBizNum(u.businessNumber) === inputBizDigits
      );
      if (!found) {
        const emailExists = users.find((u) => u.email.toLowerCase() === trimmedEmail);
        if (emailExists) {
          return {
            success: false,
            error: '입력하신 회사 사업자등록번호와 일치하지 않는 계정입니다.',
          };
        }
        return {
          success: false,
          error: '입력하신 사업자번호 및 이메일로 등록된 계정을 찾을 수 없습니다.',
        };
      }
    } else {
      found = users.find((u) => u.email.toLowerCase() === trimmedEmail);
      if (!found) {
        return { success: false, error: '등록되지 않은 이메일 주소입니다.' };
      }
    }

    // Password verification (if password provided)
    if (password) {
      const trimmedInputPw = password.trim();
      const userPw = found.password || '';
      const userTempPw = found.tempPassword;

      const matchesRegular = trimmedInputPw === userPw;
      const matchesTemp = userTempPw && trimmedInputPw === userTempPw;

      if (!matchesRegular && !matchesTemp) {
        return {
          success: false,
          error: '비밀번호가 일치하지 않습니다. 비밀번호를 잊으셨다면 [비밀번호 찾기]를 신청해 주세요.',
        };
      }

      // If logged in using temp password, require immediate password change
      if (matchesTemp) {
        setUsers((prev) =>
          prev.map((u) => (u.id === found!.id ? { ...u, requirePasswordChange: true } : u))
        );
      }
    }

    // Check account status
    if (found.status === 'INACTIVE') {
      return {
        success: false,
        error: '비활성화(이용 정지)된 계정입니다. 시스템 관리자에게 문의해 주세요.',
      };
    }

    if (found.role === 'EMPLOYEE') {
      if (found.status === 'PENDING') {
        return {
          success: false,
          error:
            '가입 승인 대기 중인 직원 계정입니다. 관리자가 [직원관리]에서 승인한 후 로그인하실 수 있습니다.',
        };
      }
      if (found.status === 'REJECTED') {
        return {
          success: false,
          error: '가입 신청이 반려된 계정입니다. 관리자에게 문의해 주세요.',
        };
      }
    }

    setCurrentUserId(found.id);

    // Record login in audit log
    const roleLabel =
      found.role === 'SUPER_ADMIN'
        ? '마스터 관리자'
        : found.role === 'ADMIN'
        ? '관리자'
        : '직원';

    auditLog?.addAuditLog({
      actionType: 'LOGIN',
      actionTitle: `사용자 로그인 성공 (${roleLabel})`,
      userId: found.id,
      userName: found.name,
      userEmail: found.email,
      userDepartment: found.department,
      userPosition: found.position,
      userRole: found.role,
      operatorId: found.id,
      operatorName: `${found.name} (본인)`,
      operatorRole: 'SELF',
      ipAddress: '192.168.1.42',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${found.name} (${found.email}) 계정으로 시스템에 정상 로그인하였습니다. (사업자번호: ${found.businessNumber})`,
    });

    return { success: true };
  };

  const register = (data: {
    email: string;
    name: string;
    businessNumber: string;
    companyName?: string;
    department?: string;
    position?: string;
    role: UserRole;
    totalLeaveDays?: number;
    password?: string;
  }) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const formattedBiz = formatBizNum(data.businessNumber);
    const bizDigits = normalizeBizNum(data.businessNumber);

    if (!bizDigits || bizDigits.length < 5) {
      return { success: false, error: '올바른 사업자등록번호(10자리)를 입력해 주세요.' };
    }

    if (!data.password || data.password.trim().length < 4) {
      return { success: false, error: '비밀번호는 최소 4자리 이상이어야 합니다.' };
    }

    // Check if email already registered within this business
    if (
      users.some(
        (u) =>
          u.email.toLowerCase() === trimmedEmail &&
          normalizeBizNum(u.businessNumber) === bizDigits
      )
    ) {
      return { success: false, error: '해당 사업장에 이미 등록된 이메일 주소입니다.' };
    }

    // Check Business Admin Quota Limit if trying to register as ADMIN
    if (data.role === 'ADMIN') {
      const currentAdminCount = users.filter(
        (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.role === 'ADMIN'
      ).length;
      const maxAllowed = getBusinessAdminLimit(data.businessNumber);

      if (currentAdminCount >= maxAllowed) {
        return {
          success: false,
          error: `해당 사업장(사업자번호: ${formattedBiz})의 관리자 계정 최대 생성 한도(${maxAllowed}개)에 도달하였습니다. 추가 관리자 계정을 가입할 수 없습니다. 시스템 최고 관리자(admin)에게 관리자 수 증설을 요청하세요.`,
        };
      }
    }

    const isEmployee = data.role === 'EMPLOYEE';
    const accountStatus: AccountStatus = isEmployee ? 'PENDING' : 'APPROVED';

    const existingLimit = businessAdminLimits.find(
      (b) => normalizeBizNum(b.businessNumber) === bizDigits
    );
    const existingUserWithCompany = users.find(
      (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.companyName
    );
    const resolvedCompanyName =
      data.companyName?.trim() ||
      existingLimit?.companyName ||
      existingUserWithCompany?.companyName ||
      '회사';

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: trimmedEmail,
      name: data.name.trim(),
      businessNumber: formattedBiz,
      companyName: resolvedCompanyName,
      department: data.department ? data.department.trim() : '일반부서',
      position: data.position ? data.position.trim() : '사원',
      role: data.role,
      joinedDate: new Date().toISOString().split('T')[0],
      totalLeaveDays: data.totalLeaveDays ?? 15,
      usedLeaveDays: 0,
      status: accountStatus,
      password: data.password ? data.password.trim() : 'password123',
    };

    setUsers((prev) => [...prev, newUser]);

    if (data.companyName?.trim()) {
      setBusinessAdminLimits((prev) => {
        const found = prev.some((b) => normalizeBizNum(b.businessNumber) === bizDigits);
        if (found) {
          return prev.map((b) =>
            normalizeBizNum(b.businessNumber) === bizDigits
              ? { ...b, companyName: data.companyName!.trim() }
              : b
          );
        } else {
          return [
            ...prev,
            {
              businessNumber: formattedBiz,
              companyName: data.companyName!.trim(),
              maxAdminCount: 1,
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            },
          ];
        }
      });
    }

    auditLog?.addAuditLog({
      actionType: 'ACCOUNT_CREATE',
      actionTitle: isEmployee ? '신규 직원 계정 가입 신청' : '관리자 계정 신규 생성',
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      userDepartment: newUser.department,
      userPosition: newUser.position,
      userRole: newUser.role,
      operatorId: newUser.id,
      operatorName: `${newUser.name} (가입자)`,
      operatorRole: 'SELF',
      ipAddress: '192.168.1.20',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${newUser.name} (${newUser.department} / ${newUser.position}) 계정이 생성되었습니다. (상태: ${accountStatus})`,
    });

    if (!isEmployee) {
      setCurrentUserId(newUser.id);
      return { success: true, isPending: false };
    } else {
      return { success: true, isPending: true };
    }
  };

  const logout = () => {
    if (currentUser) {
      auditLog?.addAuditLog({
        actionType: 'LOGOUT',
        actionTitle: '로그아웃',
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userDepartment: currentUser.department,
        userPosition: currentUser.position,
        userRole: currentUser.role,
        operatorId: currentUser.id,
        operatorName: `${currentUser.name} (본인)`,
        operatorRole: 'SELF',
        ipAddress: '192.168.1.42',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `${currentUser.name} (${currentUser.email}) 계정이 정상 로그아웃 처리되었습니다.`,
      });
    }
    setCurrentUserId(null);
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUserId(target.id);
      try {
        sessionStorage.setItem(CURRENT_USER_KEY, target.id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const getUserQuota = (userId: string, year: number = 2026): UserYearQuota => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return {
        year,
        statutoryLeaveDays: 15,
        carriedOverLeaveDays: 0,
        compensatoryLeaveDays: 0,
        baseQuota: 15,
        carryOverDays: 0,
        expiredDays: 0,
        adjustedDays: 0,
        totalLeaveDays: 15,
        usedLeaveDays: 0,
      };
    }

    // 1. Check if annualQuotas for the requested year exists
    if (target.annualQuotas && target.annualQuotas[year]) {
      const q = target.annualQuotas[year];
      const statutory =
        typeof q.statutoryLeaveDays === 'number'
          ? q.statutoryLeaveDays
          : typeof q.baseQuota === 'number'
          ? q.baseQuota
          : typeof target.statutoryLeaveDays === 'number'
          ? target.statutoryLeaveDays
          : 15;
      const carried =
        typeof q.carriedOverLeaveDays === 'number'
          ? q.carriedOverLeaveDays
          : typeof q.carryOverDays === 'number'
          ? q.carryOverDays
          : 0;
      const compensatory = typeof q.compensatoryLeaveDays === 'number' ? q.compensatoryLeaveDays : 0;
      const total =
        typeof q.totalLeaveDays === 'number'
          ? q.totalLeaveDays
          : Number((statutory + carried + compensatory).toFixed(1));

      return {
        ...q,
        year,
        statutoryLeaveDays: statutory,
        carriedOverLeaveDays: carried,
        compensatoryLeaveDays: compensatory,
        baseQuota: statutory,
        carryOverDays: carried,
        totalLeaveDays: total,
        usedLeaveDays: q.usedLeaveDays ?? 0,
      };
    }

    // Parse join year
    const joinYear = target.joinedDate ? parseInt(target.joinedDate.slice(0, 4), 10) : 2026;

    // 2. If year is before employee joined company
    if (year < joinYear) {
      return {
        year,
        statutoryLeaveDays: 0,
        carriedOverLeaveDays: 0,
        compensatoryLeaveDays: 0,
        baseQuota: 0,
        carryOverDays: 0,
        expiredDays: 0,
        adjustedDays: 0,
        totalLeaveDays: 0,
        usedLeaveDays: 0,
      };
    }

    // 3. For year 2026 (current active system year)
    if (year === 2026) {
      const statutory =
        typeof target.statutoryLeaveDays === 'number'
          ? target.statutoryLeaveDays
          : target.totalLeaveDays ?? 15;
      const carried = typeof target.carriedOverLeaveDays === 'number' ? target.carriedOverLeaveDays : 0;
      const compensatory =
        typeof target.compensatoryLeaveDays === 'number' ? target.compensatoryLeaveDays : 0;
      const total =
        typeof target.totalLeaveDays === 'number'
          ? target.totalLeaveDays
          : Number((statutory + carried + compensatory).toFixed(1));

      return {
        year: 2026,
        statutoryLeaveDays: statutory,
        carriedOverLeaveDays: carried,
        compensatoryLeaveDays: compensatory,
        baseQuota: statutory,
        carryOverDays: carried,
        expiredDays: 0,
        adjustedDays: 0,
        totalLeaveDays: total,
        usedLeaveDays: target.usedLeaveDays ?? 0,
      };
    }

    // 4. For historical or future years (e.g. 2023, 2024, 2025, 2027, 2028)
    // Calculate statutory leave by labor standard law tenure
    const yearsDiff = Math.max(0, year - joinYear);
    let estimatedStatutory = 15;
    if (yearsDiff === 0) {
      estimatedStatutory = target.statutoryLeaveDays || 11;
    } else {
      estimatedStatutory = Math.min(25, 15 + Math.floor((yearsDiff - 1) / 2));
    }

    let estimatedUsed = 0;
    let estimatedCarried = 0;

    const estimatedTotal = Number((estimatedStatutory + estimatedCarried).toFixed(1));

    return {
      year,
      statutoryLeaveDays: estimatedStatutory,
      carriedOverLeaveDays: estimatedCarried,
      compensatoryLeaveDays: 0,
      baseQuota: estimatedStatutory,
      carryOverDays: estimatedCarried,
      expiredDays: 0,
      adjustedDays: 0,
      totalLeaveDays: estimatedTotal,
      usedLeaveDays: estimatedUsed,
    };
  };

  const updateUserLeaveBreakdown = (
    userId: string,
    statutory: number,
    carried: number,
    compensatory: number,
    year: number = 2026
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const total = Number((statutory + carried + compensatory).toFixed(1));
    const prevQuota = getUserQuota(userId, year);
    const prevStatutory = prevQuota.statutoryLeaveDays ?? 15;
    const prevCarried = prevQuota.carriedOverLeaveDays ?? 0;
    const prevCompensatory = prevQuota.compensatoryLeaveDays ?? 0;
    const prevTotal = prevQuota.totalLeaveDays;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const existingYearQuota = u.annualQuotas?.[year] || getUserQuota(userId, year);
          const updatedYearQuota: UserYearQuota = {
            ...existingYearQuota,
            year,
            statutoryLeaveDays: statutory,
            carriedOverLeaveDays: carried,
            compensatoryLeaveDays: compensatory,
            baseQuota: statutory,
            carryOverDays: carried,
            totalLeaveDays: total,
          };
          const updatedQuotas = {
            ...(u.annualQuotas || {}),
            [year]: updatedYearQuota,
          };

          const isCurrentYear = year === 2026;
          return {
            ...u,
            statutoryLeaveDays: isCurrentYear ? statutory : u.statutoryLeaveDays,
            carriedOverLeaveDays: isCurrentYear ? carried : u.carriedOverLeaveDays,
            compensatoryLeaveDays: isCurrentYear ? compensatory : u.compensatoryLeaveDays,
            totalLeaveDays: isCurrentYear ? total : u.totalLeaveDays,
            annualQuotas: updatedQuotas,
          };
        }
        return u;
      })
    );

    auditLog?.addAuditLog({
      actionType: 'QUOTA_CHANGE',
      actionTitle: `${year}년도 연차 상세 구성 조정 (법정/이월/보상)`,
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 직원의 ${year}년도 연차 구성이 [법정: ${statutory}일, 이월: ${carried > 0 ? `+${carried}` : carried}일, 보상: ${compensatory}일 = 총 ${total}일]로 조정되었습니다.`,
      diff: {
        fields: [
          { label: `${year}년도 법정연차`, key: 'statutoryLeaveDays', before: `${prevStatutory}일`, after: `${statutory}일` },
          { label: `${year}년도 이월연차`, key: 'carriedOverLeaveDays', before: `${prevCarried > 0 ? `+${prevCarried}` : prevCarried}일`, after: `${carried > 0 ? `+${carried}` : carried}일` },
          { label: `${year}년도 보상연차`, key: 'compensatoryLeaveDays', before: `${prevCompensatory}일`, after: `${compensatory}일` },
          { label: `${year}년도 총 부여 연차`, key: 'totalLeaveDays', before: `${prevTotal}일`, after: `${total}일` },
        ],
      },
    });
  };

  const rolloverLeaveToNextYear = (
    userId?: string,
    targetNextYear?: number
  ): { success: boolean; message?: string } => {
    // 음수 양수 모두 다음해로 이월
    const targetUsers = userId ? users.filter((u) => u.id === userId) : users.filter((u) => u.role !== 'SUPER_ADMIN');
    if (targetUsers.length === 0) {
      return { success: false, message: '이월 대상 직원이 없습니다.' };
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (userId && u.id !== userId) return u;
        if (!userId && u.role === 'SUPER_ADMIN') return u;

        // 남은 연차 계산 (음수 / 양수 모두 허용)
        const currentRemaining = Number((u.totalLeaveDays - u.usedLeaveDays).toFixed(1));
        const newStatutory = typeof u.statutoryLeaveDays === 'number' && u.statutoryLeaveDays > 0 ? u.statutoryLeaveDays : 15;
        const newCarried = currentRemaining; // can be negative or positive!
        const newCompensatory = 0;
        const newTotal = Number((newStatutory + newCarried + newCompensatory).toFixed(1));

        auditLog?.addAuditLog({
          actionType: 'YEAR_END_CARRYOVER',
          actionTitle: `[익년도 연차 이월] ${u.name} (잔여: ${currentRemaining > 0 ? `+${currentRemaining}` : currentRemaining}일)`,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userDepartment: u.department,
          userPosition: u.position,
          userRole: u.role,
          operatorId: currentUser?.id || 'admin',
          operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
          operatorRole: currentUser?.role || 'ADMIN',
          ipAddress: '192.168.1.12',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
          details: `${u.name} 직원의 당해 남은 연차 ${currentRemaining > 0 ? `+${currentRemaining}` : currentRemaining}일이 다음해 이월연차로 전액 반영되었습니다. (새 법정: ${newStatutory}일, 이월: ${newCarried}일, 총 연차: ${newTotal}일, 사용일수 0일 초기화)`,
          diff: {
            fields: [
              { label: '전년도 잔여 연차', key: 'prevRemaining', before: `${currentRemaining}일`, after: '0일 (이월완료)' },
              { label: '익년도 이월연차', key: 'carriedOverLeaveDays', before: `${u.carriedOverLeaveDays ?? 0}일`, after: `${newCarried > 0 ? `+${newCarried}` : newCarried}일` },
              { label: '익년도 총 부여 연차', key: 'totalLeaveDays', before: `${u.totalLeaveDays}일`, after: `${newTotal}일` },
              { label: '익년도 사용 연차', key: 'usedLeaveDays', before: `${u.usedLeaveDays}일`, after: '0일 (초기화)' },
            ],
          },
        });

        return {
          ...u,
          statutoryLeaveDays: newStatutory,
          carriedOverLeaveDays: newCarried,
          compensatoryLeaveDays: newCompensatory,
          totalLeaveDays: newTotal,
          usedLeaveDays: 0,
        };
      })
    );

    return {
      success: true,
      message: userId
        ? `${targetUsers[0].name} 직원의 남은 연차가 다음해로 성공적으로 이월되었습니다.`
        : `전체 ${targetUsers.length}명 직원의 남은 연차가 다음해로 성공적으로 이월되었습니다.`,
    };
  };

  const updateUserQuota = (userId: string, newTotalDays: number, year: number = 2026) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const prevQuota = getUserQuota(userId, year);
    const prevDays = prevQuota.totalLeaveDays;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const existingYearQuota = u.annualQuotas?.[year] || getUserQuota(userId, year);
          const updatedYearQuota: UserYearQuota = {
            ...existingYearQuota,
            totalLeaveDays: newTotalDays,
            baseQuota: Math.max(0, newTotalDays - existingYearQuota.carryOverDays),
          };
          const updatedQuotas = {
            ...(u.annualQuotas || {}),
            [year]: updatedYearQuota,
          };

          const currentWorkYear = typeof window !== 'undefined' && localStorage.getItem('leave_app_work_year_v1')
            ? Number(localStorage.getItem('leave_app_work_year_v1'))
            : 2026;

          return {
            ...u,
            totalLeaveDays: year === currentWorkYear ? newTotalDays : u.totalLeaveDays,
            annualQuotas: updatedQuotas,
          };
        }
        return u;
      })
    );

    const timestamp = year === 2027 ? '2027-01-01 10:00:00' : undefined;

    auditLog?.addAuditLog({
      actionType: 'QUOTA_CHANGE',
      actionTitle: `${year}년도 직원 연차 일수 변경`,
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'ADMIN',
      timestamp,
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 직원의 ${year}년도 총 부여 연차가 ${prevDays}일에서 ${newTotalDays}일로 조정되었습니다.`,
      diff: {
        fields: [
          { label: `${year}년도 총 부여 연차`, key: 'totalLeaveDays', before: `${prevDays}일`, after: `${newTotalDays}일` },
        ],
      },
    });
  };

  const updateUserUsedDays = (userId: string, additionalDays: number, year: number = 2026) => {
    const target = users.find((u) => u.id === userId);
    const prevQuota = target ? getUserQuota(userId, year) : null;
    const prevUsed = prevQuota?.usedLeaveDays ?? 0;
    const newUsed = Math.max(0, Number((prevUsed + additionalDays).toFixed(1)));
    const prevRemaining = prevQuota ? Number((prevQuota.totalLeaveDays - prevUsed).toFixed(1)) : 0;
    const newRemaining = prevQuota ? Number((prevQuota.totalLeaveDays - newUsed).toFixed(1)) : 0;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const existingYearQuota = u.annualQuotas?.[year] || getUserQuota(userId, year);
          const updatedYearQuota: UserYearQuota = {
            ...existingYearQuota,
            usedLeaveDays: newUsed,
          };
          const updatedQuotas = {
            ...(u.annualQuotas || {}),
            [year]: updatedYearQuota,
          };

          const currentWorkYear = typeof window !== 'undefined' && localStorage.getItem('leave_app_work_year_v1')
            ? Number(localStorage.getItem('leave_app_work_year_v1'))
            : 2026;

          return {
            ...u,
            usedLeaveDays: year === currentWorkYear ? newUsed : u.usedLeaveDays,
            annualQuotas: updatedQuotas,
          };
        }
        return u;
      })
    );

    if (target && additionalDays > 0) {
      const timestamp = year === 2027 ? '2027-01-01 10:00:00' : undefined;
      auditLog?.addAuditLog({
        actionType: 'LEAVE_DEDUCTION',
        actionTitle: `${year}년도 연차 잔여 일수 차감 (${target.name})`,
        userId: target.id,
        userName: target.name,
        userEmail: target.email,
        userDepartment: target.department,
        userPosition: target.position,
        userRole: target.role,
        operatorId: currentUser?.id || 'admin',
        operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
        operatorRole: currentUser?.role || 'ADMIN',
        timestamp,
        ipAddress: '192.168.1.12',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `${target.name} 직원의 ${year}년도 연차가 ${additionalDays}일 차감 처리되었습니다. (잔여: ${prevRemaining}일 -> ${newRemaining}일)`,
        diff: {
          fields: [
            { label: `${year}년도 사용 연차`, key: 'usedLeaveDays', before: `${prevUsed}일`, after: `${newUsed}일` },
            { label: `${year}년도 잔여 연차`, key: 'remainingLeave', before: `${prevRemaining}일`, after: `${newRemaining}일` },
          ],
        },
      });
    }
  };

  const updateYearTransitionPolicy = (policy: Partial<YearTransitionPolicy>) => {
    setYearTransitionPolicy((prev) => {
      const updated = { ...prev, ...policy };
      try {
        localStorage.setItem(YEAR_POLICY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const executeYearTransition = (customConfig?: Partial<YearTransitionPolicy>) => {
    const mergedPolicy: YearTransitionPolicy = {
      ...yearTransitionPolicy,
      ...customConfig,
      lastTransitionAt: '2027-01-01 00:00:00',
      isTransitionCompleted: true,
    };

    let totalCarryOver = 0;
    let totalExpired = 0;
    let totalNewGranted = 0;
    let processedCount = 0;

    setUsers((prevUsers) => {
      return prevUsers.map((u) => {
        if (u.role === 'SUPER_ADMIN') return u;

        processedCount++;
        const q2026 = u.annualQuotas?.[2026] || {
          year: 2026,
          baseQuota: u.totalLeaveDays,
          carryOverDays: 0,
          expiredDays: 0,
          adjustedDays: 0,
          totalLeaveDays: u.totalLeaveDays,
          usedLeaveDays: u.usedLeaveDays,
        };

        const remaining2026 = Number((q2026.totalLeaveDays - q2026.usedLeaveDays).toFixed(1));

        let carryOver = 0;
        let expired = 0;

        if (remaining2026 < 0) {
          // 음수(마이너스) 잔여 연차는 다음해로 그대로 전액 이월되어 총연차에서 자동 차감
          carryOver = remaining2026;
          expired = 0;
        } else if (mergedPolicy.allowCarryOver) {
          carryOver = mergedPolicy.maxCarryOverDays > 0
            ? Math.min(remaining2026, mergedPolicy.maxCarryOverDays)
            : remaining2026;
          expired = mergedPolicy.expireRemaining
            ? Math.max(0, Number((remaining2026 - carryOver).toFixed(1)))
            : 0;
        } else {
          carryOver = 0;
          expired = remaining2026;
        }

        totalCarryOver += carryOver;
        totalExpired += expired;

        const baseQuota2027 = typeof u.statutoryLeaveDays === 'number' && u.statutoryLeaveDays > 0
          ? u.statutoryLeaveDays
          : (mergedPolicy.defaultNewQuota || 15);
        totalNewGranted += baseQuota2027;

        const totalLeaveDays2027 = Number((baseQuota2027 + carryOver).toFixed(1));
        const usedLeaveDays2027 = 0; // 0으로 초기화!

        const q2027: UserYearQuota = {
          year: 2027,
          baseQuota: baseQuota2027,
          carryOverDays: carryOver,
          expiredDays: expired,
          adjustedDays: 0,
          totalLeaveDays: totalLeaveDays2027,
          usedLeaveDays: usedLeaveDays2027,
        };

        // Audit Log 1: YEAR_TRANSITION with timestamp 2027-01-01 00:00:00
        auditLog?.addAuditLog({
          actionType: 'YEAR_TRANSITION',
          actionTitle: `[2027년도 연도 전환] ${u.name} 연차 이월 및 소멸 처리`,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userDepartment: u.department,
          userPosition: u.position,
          userRole: u.role,
          operatorId: currentUser?.id || 'admin',
          operatorName: currentUser ? `${currentUser.name} (관리자)` : 'admin (최고관리자)',
          operatorRole: currentUser?.role || 'ADMIN',
          timestamp: '2027-01-01 00:00:00',
          ipAddress: '192.168.1.1',
          userAgent: 'Leave-Year-Transition-Engine/2027',
          details: `2026-12-31 23:59:59 마감(잔여 ${remaining2026}일) -> 2027-01-01 00:00:00 연도 전환 적용: 이월 ${carryOver}일, 소멸 ${expired}일, 2027 신규부여 ${baseQuota2027}일, 2027 총 연차 ${totalLeaveDays2027}일, 사용 연차 0일 초기화`,
          diff: {
            fields: [
              { label: '2026년 마감 잔여 연차', key: 'remaining2026', before: `${remaining2026}일`, after: '0일 (마감)' },
              { label: '2027년 이월 연차', key: 'carryOverDays', before: '0일', after: `${carryOver}일` },
              { label: '2026년 소멸 연차', key: 'expiredDays', before: '0일', after: `${expired}일` },
              { label: '2027년 신규 부여 연차', key: 'baseQuota2027', before: '0일', after: `${baseQuota2027}일` },
              { label: '2027년 사용 연차', key: 'usedLeaveDays', before: `${q2026.usedLeaveDays}일 (2026)`, after: '0일 (초기화)' },
              { label: '2027년 최종 잔여 연차', key: 'totalRemaining2027', before: `${remaining2026}일`, after: `${totalLeaveDays2027}일` },
            ],
          },
        });

        // Audit Log 2: QUOTA_GRANT with timestamp 2027-01-01 00:00:00
        auditLog?.addAuditLog({
          actionType: 'QUOTA_GRANT',
          actionTitle: `[2027년도 정기 연차 부여] ${u.name} 법정 연차 ${baseQuota2027}일 신규 부여`,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userDepartment: u.department,
          userPosition: u.position,
          userRole: u.role,
          operatorId: currentUser?.id || 'admin',
          operatorName: currentUser ? `${currentUser.name} (관리자)` : 'admin (최고관리자)',
          operatorRole: currentUser?.role || 'ADMIN',
          timestamp: '2027-01-01 00:00:00',
          ipAddress: '192.168.1.1',
          userAgent: 'Leave-Year-Transition-Engine/2027',
          details: `2027 회계연도 법정 신규 연차 ${baseQuota2027}일 정기 부여 완료 (잔여 연차 0일 초기화 후 ${totalLeaveDays2027}일로 업데이트)`,
          diff: {
            fields: [
              { label: '2027년 기본 부여 연차', key: 'baseQuota', before: '0일', after: `${baseQuota2027}일` },
              { label: '2027년 총 연차(이월포함)', key: 'totalLeaveDays', before: '0일', after: `${totalLeaveDays2027}일` },
            ],
          },
        });

        return {
          ...u,
          statutoryLeaveDays: baseQuota2027,
          carriedOverLeaveDays: carryOver,
          compensatoryLeaveDays: 0,
          totalLeaveDays: totalLeaveDays2027,
          usedLeaveDays: 0,
          annualQuotas: {
            ...(u.annualQuotas || {}),
            [2026]: q2026,
            [2027]: q2027,
          },
        };
      });
    });

    setYearTransitionPolicy(mergedPolicy);
    try {
      localStorage.setItem(YEAR_POLICY_KEY, JSON.stringify(mergedPolicy));
      localStorage.setItem('leave_app_work_year_v1', '2027');
    } catch (e) {
      console.error(e);
    }

    return {
      success: true,
      summary: {
        processedCount,
        totalCarryOver,
        totalExpired,
        totalNewGranted,
      },
    };
  };

  const resetYearTransition = () => {
    setUsers((prevUsers) => {
      return prevUsers.map((u) => {
        const q2026 = u.annualQuotas?.[2026];
        const origTotal = q2026 ? q2026.totalLeaveDays : u.totalLeaveDays;
        const origUsed = q2026 ? q2026.usedLeaveDays : u.usedLeaveDays;

        const { [2027]: _, ...restQuotas } = u.annualQuotas || {};

        return {
          ...u,
          totalLeaveDays: origTotal,
          usedLeaveDays: origUsed,
          annualQuotas: restQuotas,
        };
      });
    });

    const revertedPolicy: YearTransitionPolicy = {
      ...yearTransitionPolicy,
      isTransitionCompleted: false,
      lastTransitionAt: undefined,
    };
    setYearTransitionPolicy(revertedPolicy);
    try {
      localStorage.setItem(YEAR_POLICY_KEY, JSON.stringify(revertedPolicy));
      localStorage.setItem('leave_app_work_year_v1', '2026');
    } catch (e) {
      console.error(e);
    }

    auditLog?.addAuditLog({
      actionType: 'YEAR_TRANSITION',
      actionTitle: '2026년도 회계연도로 원복 (연도 전환 초기화)',
      userId: currentUser?.id || 'admin',
      userName: currentUser?.name || 'admin',
      userEmail: currentUser?.email || 'admin@segyotax.com',
      userRole: currentUser?.role || 'ADMIN',
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (관리자)` : 'admin',
      operatorRole: currentUser?.role || 'ADMIN',
      timestamp: '2026-12-31 23:59:59',
      details: '2027년도 연도 전환 및 연차 이월 처리를 취소하고 2026년도 마감 전 상태로 원복하였습니다.',
    });
  };

  const updateUserPosition = (userId: string, newPosition: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const prevPos = target.position;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, position: newPosition } : u))
    );

    auditLog?.addAuditLog({
      actionType: 'PROFILE_UPDATE',
      actionTitle: '직급 정보 변경',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: newPosition,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: 'ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 직원의 직급이 ${prevPos}에서 ${newPosition}(으)로 변경되었습니다.`,
      diff: {
        fields: [
          { label: '직급', key: 'position', before: prevPos, after: newPosition },
        ],
      },
    });
  };

  const updateUserRole = (userId: string, newRole: UserRole): { success: boolean; error?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: '사용자를 찾을 수 없습니다.' };
    if (target.id === currentUser?.id) {
      return { success: false, error: '본인 계정의 권한은 직접 변경할 수 없습니다.' };
    }

    // If upgrading to ADMIN, check max admin limit for this business
    if (newRole === 'ADMIN' && target.role !== 'ADMIN') {
      const bizDigits = normalizeBizNum(target.businessNumber);
      const currentAdminCount = users.filter(
        (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.role === 'ADMIN'
      ).length;
      const maxAllowed = getBusinessAdminLimit(target.businessNumber);

      if (currentAdminCount >= maxAllowed) {
        return {
          success: false,
          error: `해당 사업장(사업자번호: ${target.businessNumber})의 관리자 계정 생성 한도(${maxAllowed}개)를 초과하여 관리자 권한을 부여할 수 없습니다. 시스템 최고 관리자(admin)에게 한도 증설을 요청하세요.`,
        };
      }
    }

    const prevRole = target.role;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    auditLog?.addAuditLog({
      actionType: 'ROLE_CHANGE',
      actionTitle: '사용자 권한 등급 변경',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: newRole,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'SUPER_ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 계정의 권한 등급이 [${prevRole}]에서 [${newRole}](으)로 변경되었습니다.`,
      diff: {
        fields: [
          { label: '권한 등급', key: 'role', before: prevRole, after: newRole },
        ],
      },
    });

    return { success: true };
  };

  const createUser = (data: {
    email: string;
    name: string;
    businessNumber: string;
    companyName?: string;
    department?: string;
    position?: string;
    role: UserRole;
    totalLeaveDays?: number;
    status?: AccountStatus;
    password?: string;
  }): { success: boolean; error?: string } => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const formattedBiz = formatBizNum(data.businessNumber);
    const bizDigits = normalizeBizNum(data.businessNumber);

    if (!bizDigits || bizDigits.length < 5) {
      return { success: false, error: '올바른 사업자등록번호를 입력해 주세요.' };
    }

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: '이미 시스템에 등록된 이메일 주소입니다.' };
    }

    // Check Business Admin Quota if creating an ADMIN
    if (data.role === 'ADMIN') {
      const currentAdminCount = users.filter(
        (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.role === 'ADMIN'
      ).length;
      const maxAllowed = getBusinessAdminLimit(data.businessNumber);

      if (currentAdminCount >= maxAllowed) {
        return {
          success: false,
          error: `해당 사업장(사업자번호: ${formattedBiz})의 관리자 계정 생성 한도(${maxAllowed}개)를 초과할 수 없습니다. 시스템 최고 관리자(admin)에게 한도 증설을 요청하세요.`,
        };
      }
    }

    const existingLimit = businessAdminLimits.find(
      (b) => normalizeBizNum(b.businessNumber) === bizDigits
    );
    const existingUserWithCompany = users.find(
      (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.companyName
    );
    const resolvedCompanyName =
      data.companyName?.trim() ||
      existingLimit?.companyName ||
      existingUserWithCompany?.companyName ||
      '회사';

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: trimmedEmail,
      name: data.name.trim(),
      businessNumber: formattedBiz,
      companyName: resolvedCompanyName,
      department: data.department?.trim() || '일반부서',
      position: data.position?.trim() || '사원',
      role: data.role,
      joinedDate: new Date().toISOString().split('T')[0],
      totalLeaveDays: data.totalLeaveDays ?? (data.role === 'SUPER_ADMIN' ? 0 : data.role === 'ADMIN' ? 20 : 15),
      usedLeaveDays: 0,
      status: data.status || 'APPROVED',
      password: data.password?.trim() || 'password123',
    };

    setUsers((prev) => [...prev, newUser]);

    if (data.companyName?.trim()) {
      setBusinessAdminLimits((prev) => {
        const found = prev.some((b) => normalizeBizNum(b.businessNumber) === bizDigits);
        if (found) {
          return prev.map((b) =>
            normalizeBizNum(b.businessNumber) === bizDigits
              ? { ...b, companyName: data.companyName!.trim() }
              : b
          );
        } else {
          return [
            ...prev,
            {
              businessNumber: formattedBiz,
              companyName: data.companyName!.trim(),
              maxAdminCount: 1,
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            },
          ];
        }
      });
    }

    const getRoleName = (r: UserRole) => {
      if (r === 'SUPER_ADMIN') return '마스터 관리자 (SUPER_ADMIN)';
      if (r === 'ADMIN') return '관리자 (ADMIN)';
      return '직원 (EMPLOYEE)';
    };

    auditLog?.addAuditLog({
      actionType: 'ACCOUNT_CREATE',
      actionTitle: `관리자에 의한 계정 생성 (${newUser.role})`,
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      userDepartment: newUser.department,
      userPosition: newUser.position,
      userRole: newUser.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'SUPER_ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `관리자가 ${newUser.name} (${newUser.email}) 계정을 ${getRoleName(newUser.role)} 권한으로 직접 등록하였습니다.`,
      diff: {
        fields: [
          { label: '계정 상태', key: 'status', before: '-', after: newUser.status },
          { label: '부여 권한', key: 'role', before: '-', after: getRoleName(newUser.role) },
          { label: '사업자등록번호', key: 'businessNumber', before: '-', after: newUser.businessNumber },
          { label: '부여 연차', key: 'totalLeaveDays', before: '-', after: `${newUser.totalLeaveDays}일` },
        ],
      },
    });

    return { success: true };
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: '삭제할 계정을 찾을 수 없습니다.' };
    if (target.id === currentUser?.id) {
      return { success: false, error: '현재 로그인 중인 본인 계정은 삭제할 수 없습니다.' };
    }

    auditLog?.addAuditLog({
      actionType: 'ACCOUNT_DELETE',
      actionTitle: '사용자 계정 삭제',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'SUPER_ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `관리자가 ${target.name} (${target.email}, 권한: ${target.role}) 계정을 데이터베이스에서 안전하게 삭제/정리하였습니다.`,
      diff: {
        fields: [
          { label: '계정 상태', key: 'status', before: target.status, after: 'DELETED (영구 삭제)' },
          { label: '권한', key: 'role', before: target.role, after: 'DELETED' },
        ],
      },
    });

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return { success: true };
  };

  const toggleUserStatus = (userId: string, newStatus: AccountStatus) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: '계정을 찾을 수 없습니다.' };
    if (target.id === currentUser?.id && newStatus === 'INACTIVE') {
      return { success: false, error: '현재 로그인된 본인 계정은 비활성화(정지)할 수 없습니다.' };
    }

    const prevStatus = target.status;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );

    const getStatusLabel = (s: AccountStatus) => {
      switch (s) {
        case 'APPROVED': return '정상 활성 (APPROVED)';
        case 'INACTIVE': return '비활성화 정지 (INACTIVE)';
        case 'PENDING': return '승인 대기 (PENDING)';
        case 'REJECTED': return '가입 반려 (REJECTED)';
      }
    };

    auditLog?.addAuditLog({
      actionType: 'STATUS_CHANGE',
      actionTitle:
        newStatus === 'INACTIVE'
          ? '계정 비활성화(이용 정지)'
          : newStatus === 'APPROVED'
          ? '계정 활성화'
          : '계정 상태 변경',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: currentUser?.role || 'SUPER_ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 계정 상태가 ${getStatusLabel(prevStatus)}에서 ${getStatusLabel(newStatus)}(으)로 변경되었습니다.`,
      diff: {
        fields: [
          { label: '계정 상태', key: 'status', before: getStatusLabel(prevStatus), after: getStatusLabel(newStatus) },
        ],
      },
    });

    return { success: true };
  };

  const approveUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'APPROVED' } : u))
    );

    auditLog?.addAuditLog({
      actionType: 'STATUS_CHANGE',
      actionTitle: '신규 가입 계정 승인',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: 'ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 직원의 가입 신청을 검토 후 최종 승인 처리했습니다.`,
      diff: {
        fields: [
          { label: '계정 상태', key: 'status', before: 'PENDING (대기)', after: 'APPROVED (승인)' },
        ],
      },
    });

    return { success: true, message: `${target.name} 직원의 가입이 승인되었습니다.` };
  };

  const rejectUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'REJECTED' } : u))
    );

    auditLog?.addAuditLog({
      actionType: 'STATUS_CHANGE',
      actionTitle: '가입 신청 반려 처리',
      userId: target.id,
      userName: target.name,
      userEmail: target.email,
      userDepartment: target.department,
      userPosition: target.position,
      userRole: target.role,
      operatorId: currentUser?.id || 'admin',
      operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
      operatorRole: 'ADMIN',
      ipAddress: '192.168.1.12',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
      details: `${target.name} 직원의 가입 신청을 반려 처리하였습니다.`,
      diff: {
        fields: [
          { label: '계정 상태', key: 'status', before: 'PENDING (대기)', after: 'REJECTED (반려)' },
        ],
      },
    });

    return { success: true, message: `${target.name} 직원의 가입이 반려되었습니다.` };
  };

  const updateEmployee = (
    userId: string,
    data: {
      position?: string;
      joinedDate?: string;
      department?: string;
      totalLeaveDays?: number;
      name?: string;
      email?: string;
      businessNumber?: string;
      companyName?: string;
      role?: UserRole;
      status?: AccountStatus;
    }
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: '계정을 찾을 수 없습니다.' };

    // If changing role to ADMIN, check max admin limit
    if (data.role && data.role === 'ADMIN' && target.role !== 'ADMIN') {
      const targetBiz = data.businessNumber || target.businessNumber;
      const bizDigits = normalizeBizNum(targetBiz);
      const currentAdminCount = users.filter(
        (u) => normalizeBizNum(u.businessNumber) === bizDigits && u.role === 'ADMIN' && u.id !== userId
      ).length;
      const maxAllowed = getBusinessAdminLimit(targetBiz);

      if (currentAdminCount >= maxAllowed) {
        return {
          success: false,
          error: `해당 사업장(사업자번호: ${formatBizNum(targetBiz)})의 관리자 계정 최대 한도(${maxAllowed}개)를 초과하여 관리자 권한을 부여할 수 없습니다. 시스템 최고 관리자(admin)에게 한도 증설을 요청하세요.`,
        };
      }
    }

    const diffFields: { label: string; key: string; before: any; after: any }[] = [];
    if (data.name !== undefined && data.name.trim() !== target.name) {
      diffFields.push({ label: '성명', key: 'name', before: target.name, after: data.name.trim() });
    }
    if (data.email !== undefined && data.email.trim() !== target.email) {
      diffFields.push({ label: '이메일', key: 'email', before: target.email, after: data.email.trim() });
    }
    if (data.position !== undefined && data.position.trim() !== target.position) {
      diffFields.push({ label: '직급', key: 'position', before: target.position, after: data.position.trim() });
    }
    if (data.joinedDate !== undefined && data.joinedDate !== target.joinedDate) {
      diffFields.push({ label: '입사일자', key: 'joinedDate', before: target.joinedDate, after: data.joinedDate });
    }
    if (data.department !== undefined && data.department.trim() !== target.department) {
      diffFields.push({ label: '소속 부서', key: 'department', before: target.department || '-', after: data.department.trim() });
    }
    if (data.totalLeaveDays !== undefined && data.totalLeaveDays !== target.totalLeaveDays) {
      diffFields.push({ label: '총 부여 연차', key: 'totalLeaveDays', before: target.totalLeaveDays, after: data.totalLeaveDays });
    }
    if (data.businessNumber !== undefined && data.businessNumber !== target.businessNumber) {
      diffFields.push({ label: '사업자등록번호', key: 'businessNumber', before: target.businessNumber, after: data.businessNumber });
    }
    if (data.role !== undefined && data.role !== target.role) {
      diffFields.push({ label: '권한 등급', key: 'role', before: target.role, after: data.role });
    }
    if (data.status !== undefined && data.status !== target.status) {
      diffFields.push({ label: '계정 상태', key: 'status', before: target.status, after: data.status });
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          name: data.name !== undefined ? data.name.trim() : u.name,
          email: data.email !== undefined ? data.email.trim().toLowerCase() : u.email,
          position: data.position !== undefined ? data.position.trim() : u.position,
          joinedDate: data.joinedDate !== undefined ? data.joinedDate : u.joinedDate,
          department: data.department !== undefined ? data.department.trim() : u.department,
          totalLeaveDays: data.totalLeaveDays !== undefined ? data.totalLeaveDays : u.totalLeaveDays,
          businessNumber: data.businessNumber !== undefined ? formatBizNum(data.businessNumber) : u.businessNumber,
          companyName:
            u.role === 'SUPER_ADMIN' || u.email === 'admin@segyotax.com'
              ? 'admin'
              : data.companyName !== undefined
              ? data.companyName.trim()
              : u.companyName,
          role: data.role !== undefined ? data.role : u.role,
          status: data.status !== undefined ? data.status : u.status,
        };
      })
    );

    if (diffFields.length > 0) {
      auditLog?.addAuditLog({
        actionType: 'PROFILE_UPDATE',
        actionTitle: '계정 및 인사정보 수정',
        userId: target.id,
        userName: data.name !== undefined ? data.name.trim() : target.name,
        userEmail: data.email !== undefined ? data.email.trim() : target.email,
        userDepartment: data.department !== undefined ? data.department.trim() : target.department,
        userPosition: data.position !== undefined ? data.position.trim() : target.position,
        userRole: data.role !== undefined ? data.role : target.role,
        operatorId: currentUser?.id || 'admin',
        operatorName: currentUser ? `${currentUser.name} (${currentUser.position || '관리자'})` : '관리자',
        operatorRole: currentUser?.role || 'SUPER_ADMIN',
        ipAddress: '192.168.1.12',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web-Client',
        details: `${target.name} 계정 정보가 수정되었습니다. (${diffFields.map((f) => f.label).join(', ')})`,
        diff: {
          fields: diffFields,
        },
      });
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        users,
        companyUsers,
        login,
        register,
        logout,
        switchUser,
        updateUserQuota,
        updateUserLeaveBreakdown,
        rolloverLeaveToNextYear,
        updateUserUsedDays,
        getUserQuota,
        yearTransitionPolicy,
        updateYearTransitionPolicy,
        executeYearTransition,
        resetYearTransition,
        updateUserPosition,
        updateUserRole,
        approveUser,
        rejectUser,
        createUser,
        deleteUser,
        toggleUserStatus,
        updateEmployee,

        // Password reset
        passwordResetRequests,
        requestPasswordReset,
        issueTempPassword,
        completePasswordChange,
        resetPasswordDirect,

        // Business admin limits
        businessAdminLimits,
        getBusinessAdminLimit,
        setBusinessAdminLimit,
        updateCompanyName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
