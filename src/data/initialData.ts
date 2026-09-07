import { User, LeaveType, LeaveRequest } from '../types.ts';

export const INITIAL_LEAVE_TYPES: LeaveType[] = [
  {
    id: 'type-annual',
    name: '연차',
    code: 'ANNUAL',
    deductionDays: 1.0,
    isPaid: true,
    description: '기본 유급 연차 휴가 (1일 차감)',
    color: '#3b82f6', // blue
    isActive: true,
    isCustom: false,
  },
  {
    id: 'type-half-am',
    name: '반차 (오전)',
    code: 'HALF_AM',
    deductionDays: 0.5,
    isPaid: true,
    description: '오전 근무 후 오후 휴무 또는 오전 휴무 (0.5일 차감)',
    color: '#06b6d4', // cyan
    isActive: true,
    isCustom: false,
  },
  {
    id: 'type-half-pm',
    name: '반차 (오후)',
    code: 'HALF_PM',
    deductionDays: 0.5,
    isPaid: true,
    description: '오후 휴무 (0.5일 차감)',
    color: '#0ea5e9', // sky
    isActive: true,
    isCustom: false,
  },
  {
    id: 'type-sick',
    name: '병가',
    code: 'SICK',
    deductionDays: 0.0,
    isPaid: true,
    description: '질병 또는 부상 치료를 위한 유급 병가 (연차 미차감)',
    color: '#f97316', // orange
    isActive: true,
    isCustom: false,
  },
  {
    id: 'type-special',
    name: '경조사 휴가',
    code: 'SPECIAL',
    deductionDays: 0.0,
    isPaid: true,
    description: '본인/가족 경조사에 따른 특별 유급 휴가 (연차 미차감)',
    color: '#8b5cf6', // purple
    isActive: true,
    isCustom: true,
  },
  {
    id: 'type-reward',
    name: '포상 휴가',
    code: 'REWARD',
    deductionDays: 0.0,
    isPaid: true,
    description: '우수 성과 및 야근 보상 특별 휴가 (연차 미차감)',
    color: '#10b981', // emerald
    isActive: true,
    isCustom: true,
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-superadmin-1',
    email: 'admin@segyotax.com',
    name: 'admin',
    role: 'SUPER_ADMIN',
    businessNumber: '999-99-99999',
    companyName: 'admin',
    department: '최고관리실',
    position: 'admin',
    joinedDate: '2024-01-01',
    statutoryLeaveDays: 0,
    carriedOverLeaveDays: 0,
    compensatoryLeaveDays: 0,
    totalLeaveDays: 0,
    usedLeaveDays: 0,
    status: 'APPROVED',
    password: 'change-me-after-first-login',
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

