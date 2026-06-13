import * as React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Button } from '../ui/Button';
import { User, Phone, Calendar, Check, Package, ShoppingBag } from 'lucide-react';
import type { Batch, ClothingItem } from '../../types';
import { ClothingQcStatus } from '../../types';
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

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface PickupResultCardProps {
  batches: Batch[];
  clothingMap: Record<string, ClothingItem[]>;
  onPickup: (batchId: string, clothingIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export const PickupResultCard: React.FC<PickupResultCardProps> = ({
  batches,
  clothingMap,
  onPickup,
  disabled,
  className,
}) => {
  const [selections, setSelections] = React.useState<Record<string, Set<string>>>({});

  React.useEffect(() => {
    const next: Record<string, Set<string>> = {};
    batches.forEach((b) => {
      const items = clothingMap[b.id] || [];
      const pickable = items.filter((c) => c.qcStatus === ClothingQcStatus.PASSED).map((c) => c.id);
      next[b.id] = new Set(pickable);
    });
    setSelections(next);
  }, [batches, clothingMap]);

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="暂无可取衣物"
        description="您的衣物还在清洗或质检中，请耐心等待通知"
      />
    );
  }

  const toggleClothing = (batchId: string, clothingId: string) => {
    setSelections((prev) => {
      const batchSet = new Set(prev[batchId] || []);
      if (batchSet.has(clothingId)) batchSet.delete(clothingId);
      else batchSet.add(clothingId);
      return { ...prev, [batchId]: batchSet };
    });
  };

  const toggleBatchAll = (batchId: string) => {
    const items = clothingMap[batchId] || [];
    const pickable = items.filter((c) => c.qcStatus === ClothingQcStatus.PASSED);
    const current = selections[batchId] || new Set<string>();
    const allSelected = pickable.every((c) => current.has(c.id));
    const nextSet = new Set<string>(allSelected ? [] : pickable.map((c) => c.id));
    setSelections((prev) => ({ ...prev, [batchId]: nextSet }));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {batches.map((batch) => {
        const items = clothingMap[batch.id] || [];
        const pickable = items.filter((c) => c.qcStatus === ClothingQcStatus.PASSED);
        const currentSel = selections[batch.id] || new Set<string>();
        const allSelected = pickable.length > 0 && pickable.every((c) => currentSel.has(c.id));
        const selectedItems = pickable.filter((c) => currentSel.has(c.id));
        const selectedAmount = selectedItems.reduce((s, c) => s + c.basePrice, 0);
        const canPickup = currentSel.size > 0 && !disabled;

        return (
          <Card key={batch.id} className="overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-500" />
                    批次 <span className="font-mono">{batch.batchNo}</span>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {batch.customerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {batch.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(batch.createdAt)}
                    </span>
                    <StatusTag status={batch.status} type="batch" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="slate">共 {items.length} 件</Badge>
                  <Badge variant="success">可取 {pickable.length} 件</Badge>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {pickable.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  该批次暂无可取件衣物
                </div>
              ) : (
                <>
                  <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 bg-white">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          allSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-slate-300 bg-white'
                        )}
                      >
                        {allSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBatchAll(batch.id)}
                        className="text-slate-600 hover:text-primary-600 font-medium"
                      >
                        {allSelected ? '取消全选' : '全选可取件衣物'}
                      </button>
                    </label>
                    <span className="text-xs text-slate-500">
                      已选 {currentSel.size} / {pickable.length} 件
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {items.map((cloth) => {
                      const canPick = cloth.qcStatus === ClothingQcStatus.PASSED;
                      const checked = currentSel.has(cloth.id);
                      return (
                        <div
                          key={cloth.id}
                          onClick={() => canPick && toggleClothing(batch.id, cloth.id)}
                          className={cn(
                            'px-4 py-3 flex items-center gap-3 transition-colors',
                            canPick ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed opacity-60',
                            checked && canPick && 'bg-primary-50/50'
                          )}
                        >
                          {canPick && (
                            <div
                              className={cn(
                                'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                                checked
                                  ? 'bg-primary-500 border-primary-500'
                                  : 'border-slate-300 bg-white'
                              )}
                            >
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          <div className="flex items-center justify-center w-10 h-10 rounded bg-slate-100 flex-shrink-0">
                            <ShoppingBag className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-slate-800">
                                {cloth.clothingType}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {cloth.barcode}
                              </span>
                              <Badge variant="slate" className="text-[10px]">
                                {cloth.color}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusTag status={getQcStatusLabel(cloth.qcStatus)} type="qc" />
                              {cloth.isValuable && (
                                <Badge variant="warning" className="text-[10px]">贵重</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-base font-bold text-slate-900 tabular-nums">
                              ¥{cloth.basePrice.toFixed(2)}
                            </div>
                            {!canPick && (
                              <div className="text-[11px] text-slate-400">暂不可取</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {currentSel.size > 0 && (
                <div className="px-4 py-3.5 bg-primary-50 border-t border-primary-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">已选 {currentSel.size} 件</div>
                    <div className="text-2xl font-bold text-primary-700 tabular-nums mt-0.5">
                      ¥{selectedAmount.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!canPickup}
                    onClick={() => onPickup(batch.id, Array.from(currentSel))}
                  >
                    确认取件
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};
