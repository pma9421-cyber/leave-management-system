import { LeaveType } from '../types.ts';

/**
 * 휴가 종류와 신청 일수를 기반으로 실제 차감될 연차 일수를 정확히 계산합니다.
 * 
 * - 미차감 휴가 (병가, 경조사, 포상 등 deductionDays === 0): 0일 차감
 * - 반차 (오전/오후, 명칭에 '반차' 포함, 또는 0.5일 신청 휴가): 0.5일 차감
 * - 일반 전일/다일 휴가: 신청 일수 * 1일당 차감 일수
 */
export function calculateLeaveDeduction(
  leaveType: LeaveType | undefined,
  requestedDays: number
): number {
  if (!leaveType) return requestedDays;
  if (leaveType.deductionDays === 0) return 0;

  // 반차(오전/오후) 또는 0.5일 신청건은 정확히 0.5일 차감 (0.5 * 0.5 = 0.25 -> 0.3 오차 방지)
  const isHalfDay =
    leaveType.code === 'HALF_AM' ||
    leaveType.code === 'HALF_PM' ||
    leaveType.name.includes('반차') ||
    requestedDays === 0.5;

  if (isHalfDay) {
    return 0.5;
  }

  const rate = leaveType.deductionDays ?? 1.0;
  return Number((rate * requestedDays).toFixed(1));
}
