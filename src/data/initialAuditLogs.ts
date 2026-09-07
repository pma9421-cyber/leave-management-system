import { AuditLog } from '../types.ts';

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-000-master-created',
    actionType: 'ACCOUNT_CREATE',
    actionTitle: '마스터 최고관리자(SUPER_ADMIN) 계정 초기화',
    userId: 'usr-superadmin-1',
    userName: 'admin',
    userEmail: 'admin@segyotax.com',
    userDepartment: '최고관리실',
    userPosition: 'admin',
    userRole: 'SUPER_ADMIN',
    operatorId: 'usr-superadmin-1',
    operatorName: 'admin (마스터 관리자)',
    operatorRole: 'SUPER_ADMIN',
    timestamp: '2026-09-05 09:35:00',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0 Safari/537.36',
    details: '최고 권한을 가진 마스터 관리자(SUPER_ADMIN) 계정 활성화 및 통합 제어 권한 부여 (사업자등록번호: 999-99-99999, 성명: admin, 직급: admin)',
    diff: {
      fields: [
        { label: '계정 권한', key: 'role', before: '없음 (신규)', after: 'SUPER_ADMIN (마스터 최고 관리자)' },
        { label: '사업자등록번호', key: 'businessNumber', before: '-', after: '999-99-99999' },
      ],
    },
  },
];
