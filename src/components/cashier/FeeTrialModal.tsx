import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Check, Calculator, ArrowRight, Receipt, TrendingUp } from 'lucide-react';
import type { ClothingItem } from '../../types';
import { FeeBreakdown } from './FeeBreakdown';

export interface FeeTrialResult {
  baseFee: number;
  overdueFee: number;
  overdueSteps?: { label: string; days: number; amount: number }[];
  discount: number;
  packageDeduction: number;
  reductions?: { reason: string; amount: number }[];
  reductionAmount: number;
  payAmount: number;
}

export interface FeeTrialModalProps {
  open: boolean;
  onClose: () => void;
  clothing: ClothingItem[];
  onConfirm?: (selectedIds: string[], result: FeeTrialResult) => void;
  calcFee: (itemIds: string[]) => FeeTrialResult;
  className?: string;
}

export const FeeTrialModal: React.FC<FeeTrialModalProps> = ({
  open,
  onClose,
  clothing,
  onConfirm,
  calcFee,
  className,
}) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(clothing.map((c) => c.id)));
      setSubmitting(false);
    }
  }, [open, clothing]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === clothing.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(clothing.map((c) => c.id)));
  };

  const selectedItems = clothing.filter((c) => selectedIds.has(c.id));
  const trialResult = React.useMemo(
    () => calcFee(Array.from(selectedIds)),
    [selectedIds, calcFee]
  );
  const fullResult = React.useMemo(
    () => calcFee(clothing.map((c) => c.id)),
    [clothing, calcFee]
  );

  const diff = fullResult.payAmount - trialResult.payAmount;

  const canConfirm = selectedIds.size > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      onConfirm?.(Array.from(selectedIds), trialResult);
      onClose();
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
          <Calculator className="w-5 h-5 text-primary-500" />
          费用试算
        </div>
      }
      size="xl"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm} loading={submitting}>
            确认按试算结算
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">选择衣物进行试算</h4>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedIds.size === clothing.length ? '取消全选' : '全选'}
            </button>
            <Badge variant="primary">已选 {selectedIds.size} / {clothing.length}</Badge>
          </div>
        </div>

        <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2.5"></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">条码</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">类型</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">颜色</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">基础价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clothing.map((c) => {
                const checked = selectedIds.has(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      checked ? 'bg-primary-50/60' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          checked ? 'bg-primary-500 border-primary-500' : 'border-slate-300 bg-white'
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 border border-slate-200 rounded-md">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-slate-500" />
              <h5 className="text-sm font-semibold text-slate-800">全单结算</h5>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>基础费：</span>
                <span className="tabular-nums">¥{fullResult.baseFee.toFixed(2)}</span>
              </div>
              {fullResult.overdueFee > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>超期费：</span>
                  <span className="tabular-nums">+¥{fullResult.overdueFee.toFixed(2)}</span>
                </div>
              )}
              {fullResult.discount > 0 && (
                <div className="flex justify-between text-success-600">
                  <span>折扣：</span>
                  <span className="tabular-nums">-¥{fullResult.discount.toFixed(2)}</span>
                </div>
              )}
              {(fullResult.reductionAmount + (fullResult.reductions?.reduce((s, r) => s + r.amount, 0) || 0)) > 0 && (
                <div className="flex justify-between text-danger-600">
                  <span>减免：</span>
                  <span className="tabular-nums">
                    -¥{(fullResult.reductionAmount + (fullResult.reductions?.reduce((s, r) => s + r.amount, 0) || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm text-slate-500">应付：</span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                ¥{fullResult.payAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 border-2 border-primary-300 bg-primary-50/50 rounded-md">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-primary-600" />
              <h5 className="text-sm font-semibold text-primary-800">
                当前试算 ({selectedItems.length} 件)
              </h5>
            </div>
            <FeeBreakdown
              baseFee={trialResult.baseFee}
              overdueFee={trialResult.overdueFee}
              overdueSteps={trialResult.overdueSteps}
              discount={trialResult.discount}
              packageDeduction={trialResult.packageDeduction}
              reductions={trialResult.reductions}
              reductionAmount={trialResult.reductionAmount}
              payAmount={trialResult.payAmount}
            />
          </div>
        </div>

        {diff > 0 && canConfirm && selectedIds.size < clothing.length && (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
            <div className="flex items-center gap-2 text-amber-800">
              <TrendingUp className="w-4 h-4" />
              <span>对比全单，剩余衣物还需支付</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-lg font-bold text-amber-700 tabular-nums">
              ¥{diff.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
