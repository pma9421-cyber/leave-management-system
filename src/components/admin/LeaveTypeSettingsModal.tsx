import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext.tsx';
import { LeaveType } from '../../types.ts';
import {
  X,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Trash2,
} from 'lucide-react';

interface LeaveTypeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaveTypeSettingsModal: React.FC<LeaveTypeSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { leaveTypes, addLeaveType, deleteLeaveType, toggleLeaveTypeActive } = useLeave();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<LeaveType | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [deductionDays, setDeductionDays] = useState<number>(1.0);
  const [isPaid, setIsPaid] = useState(true);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    if (!typeToDelete) return;
    const res = await deleteLeaveType(typeToDelete.id);
    if (!res.success) {
      setErrorMsg(res.error || '삭제에 실패했습니다.');
    } else {
      setSuccessMsg(`'${typeToDelete.name}' 휴가 종류가 삭제되었습니다.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setTypeToDelete(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('휴가 명칭을 입력해 주세요.');
      return;
    }

    const res = await addLeaveType({
      name: name.trim(),
      code: code.trim().toUpperCase() || `CUSTOM_${Date.now()}`,
      deductionDays: Number(deductionDays),
      isPaid,
      description: description.trim() || '신규 생성된 휴가 유형',
      color,
      isActive: true,
      isCustom: true,
    });

    if (!res.success) {
      setErrorMsg(res.error || '생성에 실패했습니다.');
    } else {
      setSuccessMsg(`'${name.trim()}' 휴가 유형이 성공적으로 등록되었습니다.`);
      setName('');
      setCode('');
      setDeductionDays(1.0);
      setDescription('');
      setIsAddingNew(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const presetColors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm sm:max-w-lg md:max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              휴가 종류 및 정책 관리
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              사내 규정에 맞는 새로운 휴가 종류를 동적으로 추가하고 활성화 여부를 관리할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* List of current leave types */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                현재 등록된 휴가 종류 ({leaveTypes.length}개)
              </h3>
              {!isAddingNew && (
                <button
                  id="btn-open-add-leave-type"
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 휴가 종류 추가</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {leaveTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                    type.isActive
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: type.color }}
                    ></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{type.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {type.code}
                        </span>
                        {type.isCustom && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-semibold">
                            커스텀
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {type.description} ·{' '}
                        <strong className="text-slate-700">
                          {type.deductionDays === 0
                            ? '연차 미차감'
                            : `연차 ${type.deductionDays}일 차감`}
                        </strong>{' '}
                        · {type.isPaid ? '유급' : '무급'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={async () => {
                        const res = await toggleLeaveTypeActive(type.id);
                        if (!res.success) setErrorMsg(res.error || '상태 변경에 실패했습니다.');
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={type.isActive ? '비활성화하기' : '활성화하기'}
                    >
                      {type.isActive ? (
                        <ToggleRight className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>

                    <button
                      id={`btn-delete-leave-type-${type.id}`}
                      onClick={() => {
                        setErrorMsg('');
                        setTypeToDelete(type);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="휴가 종류 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {typeToDelete && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in space-y-2.5">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>정말 '{typeToDelete.name}' 휴가 종류를 삭제하시겠습니까?</span>
              </div>
              <p className="text-[11px] text-rose-700">
                이 휴가 종류를 삭제하면 향후 직원들의 휴가 신청 목록에서 선택할 수 없게 됩니다.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTypeToDelete(null)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  id="btn-confirm-delete-type"
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-2xs transition-colors"
                >
                  삭제 확인
                </button>
              </div>
            </div>
          )}

          {/* Add New Type Form Drawer/Card */}
          {isAddingNew && (
            <form
              onSubmit={handleCreate}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>새로운 휴가 종류 정의 (확장 DB 연동)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  닫기
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    휴가 명칭 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 리프레시 휴가, 백신 휴가, 안식월"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    시스템 코드 (영문)
                  </label>
                  <input
                    type="text"
                    placeholder="REFRESH, VACCINE 등"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    연차 차감 일수 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deductionDays}
                    onChange={(e) => setDeductionDays(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value={1.0}>1.0일 차감 (기본 하루 휴가)</option>
                    <option value={0.5}>0.5일 차감 (반차 형식)</option>
                    <option value={0.0}>0.0일 미차감 (회사 지원 특별 유급)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    유급 / 무급 여부
                  </label>
                  <select
                    value={isPaid ? 'true' : 'false'}
                    onChange={(e) => setIsPaid(e.target.value === 'true')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="true">유급 휴가 (기본급 전액 지급)</option>
                    <option value="false">무급 휴가</option>
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  뱃지 색상 선택
                </label>
                <div className="flex items-center gap-2">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c ? 'scale-125 border-slate-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  휴가 설명 및 가이드
                </label>
                <input
                  type="text"
                  placeholder="직원이 신청할 때 참고할 규정이나 대상 기준"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  id="btn-confirm-add-leave-type"
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  휴가 종류 등록 완료
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
