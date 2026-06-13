import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Scissors, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Batch, ClothingItem } from '../../types';
import { ClothingQcStatus } from '../../types';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getQcStatusLabel(status: ClothingQcStatus): string {
  const map: Record<ClothingQcStatus, string> = {
    [ClothingQcStatus.NOT_INSPECTED]: '待质检',
    [ClothingQcStatus.PASSED]: '质检通过',
    [ClothingQcStatus.FAILED]: '质检未通过',
    [ClothingQcStatus.EXCEPTION]: '质检异常',
  };
  return map[status] || status;
}

export interface SplitBatchModalProps {
  open: boolean;
  batch: Batch | null;
  onClose: () => void;
  onSplit?: (newBatchId: string) => void;
  className?: string;
}

export const SplitBatchModal: React.FC<SplitBatchModalProps> = ({
  open,
  batch,
  onClose,
  onSplit,
  className,
}) => {
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const splitBatch = useAppStore((s) => s.splitBatch);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const batchId = batch?.id || null;
  const allClothing: ClothingItem[] = batchId ? getClothingByBatchId(batchId) : [];

  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSubmitting(false);
      setError(null);
    }
  }, [open, batchId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allClothing.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allClothing.map((c) => c.id)));
    }
  };

  const selectedItems = allClothing.filter((c) => selectedIds.has(c.id));
  const remainingItems = allClothing.filter((c) => !selectedIds.has(c.id));

  const canSubmit = selectedIds.size > 0 && selectedIds.size < allClothing.length;

  const handleSubmit = async () => {
    if (!canSubmit || !batchId) return;
    setSubmitting(true);
    setError(null);
    try {
      const newBatch = splitBatch(batchId, Array.from(selectedIds));
      onSplit?.(newBatch.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary-500" />
          拆分批次
        </div>
      }
      size="xl"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
          >
            确认拆分
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger" title="拆分失败" message={error} />}

        {batch && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm">
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
              <div>
                <span className="text-slate-500">原批次：</span>
                <span className="font-mono font-medium text-primary-700">{batch.batchNo}</span>
              </div>
              <div>
                <span className="text-slate-500">顾客：</span>
                <span className="font-medium">{batch.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500">创建时间：</span>
                <span className="tabular-nums">{formatDate(batch.createdAt)}</span>
              </div>
            </div>
          </div>
        )}

        {!canSubmit && allClothing.length > 0 && (
          <Alert
            variant="warning"
            icon={AlertCircle}
            message="请选择要拆分到新批次的衣物（至少选择1件，且不能全选）"
          />
        )}

        {allClothing.length === 0 ? (
          <EmptyState title="该批次没有衣物" description="无法进行拆分操作" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                选择要拆分的衣物
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedIds.size === allClothing.length ? '取消全选' : '全选'}
                </button>
                <Badge variant="primary">已选 {selectedIds.size} / {allClothing.length}</Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">条码</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">类型</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">颜色</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">质检状态</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">价格</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allClothing.map((cloth) => {
                    const checked = selectedIds.has(cloth.id);
                    return (
                      <tr
                        key={cloth.id}
                        onClick={() => toggleSelect(cloth.id)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          checked ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <div
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                              checked
                                ? 'bg-primary-500 border-primary-500'
                                : 'border-slate-300 bg-white'
                            )}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{cloth.barcode}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{cloth.clothingType}</td>
                        <td className="px-3 py-2.5 text-slate-600">{cloth.color}</td>
                        <td className="px-3 py-2.5">
                          <StatusTag status={getQcStatusLabel(cloth.qcStatus)} type="qc" />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">
                          ¥{cloth.basePrice.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedIds.size > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 border border-slate-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-slate-800">原批次（剩余）</h5>
                    <Badge variant="slate">{remainingItems.length} 件</Badge>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <div>批次号：<span className="font-mono text-slate-700">{batch?.batchNo}</span></div>
                    <div>
                      金额：
                      <span className="font-semibold tabular-nums text-slate-800">
                        ¥ {remainingItems.reduce((s, c) => s + c.basePrice, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-primary-300 bg-primary-50/50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-primary-800 flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4" />
                      新批次（拆分出）
                    </h5>
                    <Badge variant="primary">{selectedItems.length} 件</Badge>
                  </div>
                  <div className="text-sm text-primary-700/80 space-y-1">
                    <div>批次号：<span className="font-mono text-primary-800">（自动生成）</span></div>
                    <div>
                      金额：
                      <span className="font-semibold tabular-nums text-primary-800">
                        ¥ {selectedItems.reduce((s, c) => s + c.basePrice, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
