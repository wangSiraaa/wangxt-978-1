import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Bell, Check, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Batch, ClothingItem } from '../../types';
import { ClothingQcStatus } from '../../types';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';

function getQcStatusLabel(status: ClothingQcStatus): string {
  const map: Record<ClothingQcStatus, string> = {
    [ClothingQcStatus.NOT_INSPECTED]: '待质检',
    [ClothingQcStatus.PASSED]: '质检通过',
    [ClothingQcStatus.FAILED]: '质检未通过',
    [ClothingQcStatus.EXCEPTION]: '质检异常',
  };
  return map[status] || status;
}

export interface BatchNotifyModalProps {
  open: boolean;
  batches: Batch[];
  onClose: () => void;
  onNotified?: () => void;
  className?: string;
}

export const BatchNotifyModal: React.FC<BatchNotifyModalProps> = ({
  open,
  batches,
  onClose,
  onNotified,
  className,
}) => {
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const clothingItems = useAppStore((s) => s.clothingItems);
  const updateClothingStatus = useAppStore((s) => s.updateClothingStatus);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [notifying, setNotifying] = React.useState(false);
  const [notifyError, setNotifyError] = React.useState<string | null>(null);

  const allClothing: ClothingItem[] = React.useMemo(() => {
    const list: ClothingItem[] = [];
    batches.forEach((b) => {
      list.push(...getClothingByBatchId(b.id));
    });
    return list;
  }, [batches, getClothingByBatchId]);

  const batchMap = React.useMemo(() => {
    const m: Record<string, Batch> = {};
    batches.forEach((b) => { m[b.id] = b; });
    return m;
  }, [batches]);

  const notifyableClothing = React.useMemo(
    () => allClothing.filter((c) => c.qcStatus === ClothingQcStatus.PASSED && !c.notified),
    [allClothing]
  );
  const nonNotifyableClothing = React.useMemo(
    () => allClothing.filter((c) => c.qcStatus !== ClothingQcStatus.PASSED || c.notified),
    [allClothing]
  );

  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(notifyableClothing.map((c) => c.id)));
      setNotifying(false);
      setNotifyError(null);
    }
  }, [open, notifyableClothing]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifyableClothing.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifyableClothing.map((c) => c.id)));
    }
  };

  const totalAmount = notifyableClothing
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.basePrice, 0);

  const canNotify = selectedIds.size > 0;

  const handleNotify = async () => {
    if (!canNotify) return;
    setNotifying(true);
    setNotifyError(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      selectedIds.forEach((clothId) => {
        const cloth = clothingItems.find((c) => c.id === clothId);
        if (cloth) {
          (cloth as any).notified = true;
        }
      });
      onNotified?.();
      onClose();
    } catch (e) {
      setNotifyError((e as Error).message);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary-500" />
          取件通知
        </div>
      }
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={notifying}>取消</Button>
          <Button variant="primary" onClick={handleNotify} disabled={!canNotify} loading={notifying}>
            发送通知（{selectedIds.size}）
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {notifyError && <Alert variant="danger" title="通知失败" message={notifyError} />}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm space-y-2">
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
            <div>
              <span className="text-slate-500">涉及批次：</span>
              <span className="font-mono font-medium text-primary-700">{batches.length} 批</span>
            </div>
            <div>
              <span className="text-slate-500">可通知衣物：</span>
              <span className="font-medium">{notifyableClothing.length} 件</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500">将通过短信通知顾客前来取件</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/70">
            {batches.slice(0, 3).map((b) => (
              <Badge key={b.id} variant="slate" className="text-[11px]">
                {b.batchNo} · {b.customerName}
              </Badge>
            ))}
            {batches.length > 3 && (
              <Badge variant="slate" className="text-[11px]">
                +{batches.length - 3} 批
              </Badge>
            )}
          </div>
        </div>

        {notifyableClothing.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="暂无可通知衣物"
            description="只有质检通过且未通知的衣物才能发送取件通知"
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                可通知衣物
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedIds.size === notifyableClothing.length ? '取消全选' : '全选'}
                </button>
                <Badge variant="primary">已选 {selectedIds.size} / {notifyableClothing.length}</Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
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
                  {notifyableClothing.map((cloth) => {
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

            {canNotify && (
              <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-md">
                <span className="text-sm text-slate-600">本次通知金额合计：</span>
                <span className="text-2xl font-bold text-primary-700 tabular-nums">
                  ¥{totalAmount.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}

        {nonNotifyableClothing.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              不可通知（{nonNotifyableClothing.length}）
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {nonNotifyableClothing.slice(0, 10).map((c) => (
                <Badge key={c.id} variant="slate" className="text-[10px]">
                  {c.barcode} · {getQcStatusLabel(c.qcStatus)}{c.notified ? ' · 已通知' : ''}
                </Badge>
              ))}
              {nonNotifyableClothing.length > 10 && (
                <Badge variant="slate" className="text-[10px]">
                  +{nonNotifyableClothing.length - 10} 件
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
