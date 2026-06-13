import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Percent, CheckCircle, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { EmptyState } from '../components/ui/EmptyState';
import { FeeBreakdown } from '../components/cashier/FeeBreakdown';
import { DayClosePanel } from '../components/cashier/DayClosePanel';
import { FeeTrialModal } from '../components/cashier/FeeTrialModal';
import type { FeeTrialResult } from '../components/cashier/FeeTrialModal';
import { ReductionModal } from '../components/cashier/ReductionModal';
import { useAppStore } from '../store/useAppStore';
import type { FeeBreakdown as FeeBreakdownType } from '../utils/feeCalc';
import type { Batch, ClothingItem } from '../types';
import { BatchStatus, FeeChangeType } from '../types';

export default function CashierConfirm() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const clothingItems = useAppStore((s) => s.clothingItems);
  const feeChanges = useAppStore((s) => s.feeChanges);
  const markPickedUp = useAppStore((s) => s.markPickedUp);
  const calculateBatchFee = useAppStore((s) => s.calculateBatchFee);
  const applyFeeChange = useAppStore((s) => s.applyFeeChange);
  const markDayClosed = useAppStore((s) => s.markDayClosed);

  const readyBatches = React.useMemo(() => {
    return batches.filter(
      (b) =>
        b.status === BatchStatus.READY ||
        b.status === BatchStatus.OVERDUE ||
        b.status === BatchStatus.PARTIAL_PICKED
    );
  }, [batches]);

  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [selectedClothingIds, setSelectedClothingIds] = React.useState<string[]>([]);
  const [breakdown, setBreakdown] = React.useState<FeeBreakdownType | null>(null);
  const [showTrial, setShowTrial] = React.useState(false);
  const [showReduction, setShowReduction] = React.useState(false);
  const [dayCloseOpen, setDayCloseOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const selectedBatch = React.useMemo(
    () => readyBatches.find((b) => b.id === selectedBatchId) || null,
    [readyBatches, selectedBatchId]
  );

  const batchClothingItems = React.useMemo(
    () => clothingItems.filter((c) => c.batchId === selectedBatchId),
    [clothingItems, selectedBatchId]
  );

  React.useEffect(() => {
    if (selectedBatchId && selectedClothingIds.length > 0) {
      const result = calculateBatchFee(selectedBatchId, selectedClothingIds);
      setBreakdown(result);
    } else {
      setBreakdown(null);
    }
  }, [selectedBatchId, selectedClothingIds, calculateBatchFee]);

  const handleMenuSelect = (key: string) => {
    switch (key) {
      case 'batches':
        navigate('/batches');
        break;
      case 'qc-board':
        navigate('/qc');
        break;
      case 'pickup-verify':
        navigate('/pickup');
        break;
      case 'overdue-fee':
        navigate('/overdue');
        break;
      case 'exceptions':
        navigate('/exceptions');
        break;
      case 'transfer':
        navigate('/transfer');
        break;
      case 'cashier-confirm':
        navigate('/cashier');
        break;
    }
  };

  const toggleClothing = (id: string) => {
    setSelectedClothingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllClothing = () => {
    if (!selectedBatchId) return;
    if (selectedClothingIds.length === batchClothingItems.length) {
      setSelectedClothingIds([]);
    } else {
      setSelectedClothingIds(batchClothingItems.map((c) => c.id));
    }
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatchId(batch.id);
    setSelectedClothingIds(
      clothingItems.filter((c) => c.batchId === batch.id).map((c) => c.id)
    );
  };

  const handleConfirmReduction = (amount: number, reason: string) => {
    if (!selectedBatchId || !breakdown) return;
    applyFeeChange(selectedBatchId, FeeChangeType.REDUCTION, -amount, reason, 'cashier');
    const newBreakdown = calculateBatchFee(selectedBatchId, selectedClothingIds);
    setBreakdown(newBreakdown);
    setShowReduction(false);
  };

  const handleConfirmPayment = () => {
    if (!selectedBatchId) return;
    setLoading(true);
    try {
      markPickedUp(selectedBatchId, selectedClothingIds, 'cashier');
      setSelectedBatchId('');
      setSelectedClothingIds([]);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClose = () => {
    const todayBatchIds = readyBatches
      .filter((b) => !b.isDayClosed)
      .map((b) => b.id);
    if (todayBatchIds.length === 0) return;
    markDayClosed(todayBatchIds, 'cashier');
  };

  const calcTrialFee = React.useCallback(
    (itemIds: string[]): FeeTrialResult => {
      if (!selectedBatchId) {
        return {
          baseFee: 0,
          overdueFee: 0,
          discount: 0,
          packageDeduction: 0,
          reductionAmount: 0,
          payAmount: 0,
        };
      }
      const fb = calculateBatchFee(selectedBatchId, itemIds);
      return {
        baseFee: fb.baseFee,
        overdueFee: fb.overdueFee,
        discount: fb.discountAmount,
        packageDeduction: fb.packageDeduction,
        reductions: fb.adjustments
          .filter((a) => a.changeType === FeeChangeType.REDUCTION)
          .map((a) => ({ reason: a.reason, amount: Math.abs(a.amount) })),
        reductionAmount: fb.adjustments
          .filter((a) => a.changeType === FeeChangeType.REDUCTION)
          .reduce((s, a) => s + Math.abs(a.amount), 0),
        payAmount: fb.totalPayable,
      };
    },
    [selectedBatchId, calculateBatchFee]
  );

  const dayCloseSummary = React.useMemo(() => {
    const closedBatches = batches.filter(
      (b) => b.isDayClosed && b.actualPickupTime
    );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayBatches = closedBatches.filter(
      (b) => new Date(b.actualPickupTime!) >= todayStart
    );

    const batchFeeChanges = feeChanges.filter(
      (f) => todayBatches.some((b) => b.id === f.batchId)
    );

    return {
      transactionCount: todayBatches.length,
      baseFee: todayBatches.reduce((s, b) => s + b.totalBaseFee, 0),
      overdueFee: todayBatches.reduce((s, b) => s + b.totalOverdueFee, 0),
      discount: todayBatches.reduce((s, b) => s + b.discountAmount, 0),
      packageDeduction: 0,
      reduction: batchFeeChanges
        .filter((f) => f.changeType === FeeChangeType.REDUCTION)
        .reduce((s, f) => s + Math.abs(f.amount), 0),
      actualReceived: todayBatches.reduce((s, b) => s + b.finalAmount, 0),
    };
  }, [batches, feeChanges]);

  const dayCloseBatchItems = React.useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return batches
      .filter((b) => b.isDayClosed && b.actualPickupTime && new Date(b.actualPickupTime!) >= todayStart)
      .map((b) => {
        const items = clothingItems
          .filter((c) => c.batchId === b.id && c.isPickedUp)
          .map((c) => ({
            id: c.id,
            barcode: c.barcode,
            clothingType: c.clothingType,
            price: c.basePrice,
          }));
        const batchFeeChanges = feeChanges.filter((f) => f.batchId === b.id);
        return {
          batch: b,
          items,
          baseFee: b.totalBaseFee,
          overdueFee: b.totalOverdueFee,
          discount: b.discountAmount,
          reduction: batchFeeChanges
            .filter((f) => f.changeType === FeeChangeType.REDUCTION)
            .reduce((s, f) => s + Math.abs(f.amount), 0),
          actual: b.finalAmount,
          paidAt: b.actualPickupTime!,
          cashier: 'cashier',
        };
      });
  }, [batches, clothingItems, feeChanges]);

  const isDayClosed = React.useMemo(
    () => readyBatches.length > 0 && readyBatches.every((b) => b.isDayClosed),
    [readyBatches]
  );

  return (
    <AppLayout
      activeKey="cashier-confirm"
      onMenuSelect={handleMenuSelect}
      title="收银确认"
      subtitle="核对待取件批次，执行费用试算、减免和确认收费"
    >
      <div className="space-y-3 h-[calc(100vh-200px)] flex flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
          <div className="col-span-4 flex flex-col min-h-0">
            <div className="text-sm font-medium text-slate-700 mb-2">待取件批次（{readyBatches.length}）</div>
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {readyBatches.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={Inbox} title="暂无待取件批次" description="请等待质检完成" size="sm" />
                </div>
              ) : (
                readyBatches.map((batch) => {
                  const batchItems = clothingItems.filter((c) => c.batchId === batch.id);
                  return (
                    <div
                      key={batch.id}
                      className={
                        'px-4 py-3 cursor-pointer transition-colors ' +
                        (selectedBatchId === batch.id
                          ? 'bg-primary-50 border-l-4 border-l-primary-500'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent')
                      }
                      onClick={() => handleSelectBatch(batch)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-slate-800">{batch.batchNo}</span>
                        <span className="text-xs text-slate-400">{batchItems.length} 件</span>
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5">{batch.customerName}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">¥{batch.finalAmount.toFixed(2)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="col-span-8 flex flex-col min-h-0">
            {selectedBatch ? (
              <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="px-4 py-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-mono font-semibold text-primary-700">{selectedBatch.batchNo}</span>
                      <span className="text-slate-500 mx-2">·</span>
                      <span className="text-slate-700">{selectedBatch.customerName}</span>
                      <span className="text-slate-400 ml-2 text-sm font-mono">{selectedBatch.customerPhone}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowTrial(true)} disabled={selectedClothingIds.length === 0}>
                        <Calculator className="w-3.5 h-3.5 mr-1" />
                        费用试算
                      </Button>
                      <Button variant="accent" size="sm" onClick={() => setShowReduction(true)} disabled={!breakdown || breakdown.totalPayable <= 0}>
                        <Percent className="w-3.5 h-3.5 mr-1" />
                        减免
                      </Button>
                      <Button variant="success" size="sm" onClick={handleConfirmPayment} loading={loading} disabled={selectedClothingIds.length === 0}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        确认收费
                      </Button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 flex items-center gap-3 border-b border-slate-200">
                      <Checkbox
                        checked={
                          batchClothingItems.length > 0 &&
                          selectedClothingIds.length === batchClothingItems.length
                        }
                        onChange={toggleAllClothing}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        取件衣物（{selectedClothingIds.length}/{batchClothingItems.length}）
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {batchClothingItems.map((item: ClothingItem) => (
                        <label key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={selectedClothingIds.includes(item.id)}
                            onChange={() => toggleClothing(item.id)}
                          />
                          <div className="flex-1">
                            <div className="text-sm text-slate-800">{item.clothingType}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.barcode} · {item.color} · {item.washProject}</div>
                          </div>
                          <span className="font-mono text-sm text-slate-700">¥{item.basePrice.toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {breakdown && (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <FeeBreakdown
                      baseFee={breakdown.baseFee}
                      overdueFee={breakdown.overdueFee}
                      discount={breakdown.discountAmount}
                      packageDeduction={breakdown.packageDeduction}
                      reductions={breakdown.adjustments
                        .filter((a) => a.changeType === FeeChangeType.REDUCTION)
                        .map((a) => ({ reason: a.reason, amount: Math.abs(a.amount) }))}
                      reductionAmount={breakdown.adjustments
                        .filter((a) => a.changeType === FeeChangeType.REDUCTION)
                        .reduce((s, a) => s + Math.abs(a.amount), 0)}
                      payAmount={breakdown.totalPayable}
                    />
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={Inbox} title="请选择批次" description="点击左侧批次查看详情并进行收费" />
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            onClick={() => setDayCloseOpen(!dayCloseOpen)}
          >
            <span className="text-sm font-medium text-slate-700">日结面板</span>
            {dayCloseOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {dayCloseOpen && (
            <DayClosePanel
              summary={dayCloseSummary}
              batchItems={dayCloseBatchItems}
              isClosed={isDayClosed}
              onCloseDay={handleDayClose}
            />
          )}
        </div>
      </div>

      <FeeTrialModal
        open={showTrial}
        onClose={() => setShowTrial(false)}
        clothing={batchClothingItems}
        calcFee={calcTrialFee}
      />

      <ReductionModal
        open={showReduction}
        onClose={() => setShowReduction(false)}
        onConfirm={handleConfirmReduction}
        currentAmount={breakdown?.totalPayable || 0}
      />
    </AppLayout>
  );
}
