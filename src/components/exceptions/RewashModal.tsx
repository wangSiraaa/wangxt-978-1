import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import {
  RefreshCw,
  Check,
  Tag,
  AlertCircle,
  ArrowRight,
  Shirt,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { ClothingItem } from '../../types';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';

const REWASH_REASONS = [
  '污渍未洗净',
  '仍有异味',
  '颜色串色',
  '衣物褶皱严重',
  '熨烫不到位',
  '其他原因',
];

export interface RewashModalProps {
  open: boolean;
  onClose: () => void;
  clothing?: ClothingItem | null;
  clothingOptions?: ClothingItem[];
  onRewash?: (params: {
    clothingIds: string[];
    reason: string;
    targetBatchNo: string | null;
  }) => void;
  onRewashed?: () => void;
  className?: string;
}

export const RewashModal: React.FC<RewashModalProps> = ({
  open,
  onClose,
  clothing,
  clothingOptions,
  onRewash,
  onRewashed,
  className,
}) => {
  const { batches, createRewash } = useAppStore();
  const { currentUser } = useAuthStore();

  const effectiveClothingOptions = clothingOptions || (clothing ? [clothing] : []);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [reason, setReason] = React.useState('');
  const [reasonDetail, setReasonDetail] = React.useState('');
  const [targetBatchNo, setTargetBatchNo] = React.useState('');
  const [errors, setErrors] = React.useState<{ clothing?: string; reason?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setReason('');
      setReasonDetail('');
      setTargetBatchNo('');
      setErrors({});
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (errors.clothing) setErrors((p) => ({ ...p, clothing: undefined }));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === effectiveClothingOptions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(effectiveClothingOptions.map((c) => c.id)));
    if (errors.clothing) setErrors((p) => ({ ...p, clothing: undefined }));
  };

  const handleSubmit = async () => {
    const clothingErr = selectedIds.size === 0 ? '请至少选择一件衣物' : undefined;
    const reasonErr = !reason.trim() ? '请选择返洗原因' : undefined;
    if (clothingErr || reasonErr) {
      setErrors({ clothing: clothingErr, reason: reasonErr });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setError(null);
    try {
      const finalReason = reason === '其他原因' && reasonDetail.trim()
        ? `${reason}：${reasonDetail.trim()}`
        : reason;
      const clothingIds = Array.from(selectedIds);
      
      if (onRewash) {
        onRewash({
          clothingIds,
          reason: finalReason,
          targetBatchNo: targetBatchNo.trim() || null,
        });
      } else {
        clothingIds.forEach((clothingId) => {
          const cloth = effectiveClothingOptions.find((c) => c.id === clothingId);
          if (cloth) {
            createRewash(cloth.batchId, clothingId, finalReason, currentUser?.name || 'system');
          }
        });
        onRewashed?.();
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedIds.size > 0 && reason.trim().length > 0;

  const availableBatchNos = React.useMemo(
    () => batches.map((b) => b.batchNo),
    [batches]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-accent-500" />
          返洗处理
        </div>
      }
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            <RefreshCw className="w-4 h-4 mr-1" />
            确认返洗
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger" title="返洗失败" message={error} />}

        {effectiveClothingOptions.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="无可返洗衣物"
            description="当前没有可进行返洗处理的衣物"
          />
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">
                  选择返洗衣物
                  {errors.clothing && (
                    <span className="text-danger-500 ml-2 text-xs">{errors.clothing}</span>
                  )}
                </label>
                <div className="flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {selectedIds.size === effectiveClothingOptions.length ? '取消全选' : '全选'}
                  </button>
                  <Badge variant="accent">已选 {selectedIds.size} / {effectiveClothingOptions.length}</Badge>
                </div>
              </div>
              <div className="border border-slate-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="w-10 px-3 py-2.5"></th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">条码</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">类型</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">颜色</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">价格</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {effectiveClothingOptions.map((c) => {
                      const checked = selectedIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => toggleSelect(c.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            checked ? 'bg-accent-50/70' : 'hover:bg-slate-50'
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <div
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                                checked
                                  ? 'bg-accent-500 border-accent-500'
                                  : 'border-slate-300 bg-white'
                              )}
                            >
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{c.barcode}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{c.clothingType}</td>
                          <td className="px-3 py-2.5 text-slate-600">{c.color}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">
                            ¥{c.basePrice.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                返洗原因
                {errors.reason && (
                  <span className="text-danger-500 ml-2 text-xs">{errors.reason}</span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REWASH_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setReason(r);
                      if (errors.reason) setErrors((p) => ({ ...p, reason: undefined }));
                    }}
                    className={cn(
                      'px-3 py-2 text-sm border rounded-md transition-all',
                      reason === r
                        ? 'bg-accent-50 border-accent-400 text-accent-800 font-medium shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-700'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {reason === '其他原因' && (
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="请补充说明具体返洗原因..."
                  rows={2}
                  className={cn(
                    'w-full mt-3 px-3 py-2 text-sm border rounded-md resize-none transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400',
                    'border-slate-300 hover:border-slate-400'
                  )}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                重新入批次号
                <span className="text-xs text-slate-400 font-normal">（留空则创建新批次）</span>
              </label>
              <Input
                icon={Tag}
                placeholder="输入或选择现有批次号"
                value={targetBatchNo}
                onChange={(e) => setTargetBatchNo(e.target.value)}
                list="batchno-list"
                className="h-10"
              />
              <datalist id="batchno-list">
                {availableBatchNos.map((no) => (
                  <option key={no} value={no} />
                ))}
              </datalist>
            </div>

            <div className="text-xs text-slate-500 pt-1">
              操作员：<span className="text-slate-700 font-medium">{currentUser?.name || '-'}</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
