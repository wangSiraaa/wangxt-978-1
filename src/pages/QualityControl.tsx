import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Filter, Inbox } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Select, type SelectOption } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { QcClothingCard } from '../components/qc/QcClothingCard';
import { QcPanel } from '../components/qc/QcPanel';
import { BatchNotifyModal } from '../components/qc/BatchNotifyModal';
import { useAppStore } from '../store/useAppStore';
import type { Batch, ClothingItem } from '../types';
import { BatchStatus, ClothingStatus } from '../types';

export default function QualityControl() {
  const navigate = useNavigate();
  const getQcBatches = useAppStore((s) => s.getQcBatches);
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const submitQc = useAppStore((s) => s.submitQc);
  const getMemberById = useAppStore((s) => s.getMemberById);
  const getPricePackageById = useAppStore((s) => s.getPricePackageById);
  const initDemoData = useAppStore((s) => s.initDemoData);

  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [selectedClothing, setSelectedClothing] = React.useState<ClothingItem | null>(null);
  const [showNotify, setShowNotify] = React.useState(false);

  React.useEffect(() => {
    initDemoData();
  }, [initDemoData]);

  const qcBatches = React.useMemo(() => getQcBatches(), [getQcBatches]);

  const batchOptions: SelectOption[] = React.useMemo(() => {
    return [
      { value: '', label: '全部门店批次' },
      ...qcBatches.map((b) => ({ value: b.id, label: `${b.batchNo} - ${b.customerName}` })),
    ];
  }, [qcBatches]);

  const visibleBatches: Batch[] = React.useMemo(() => {
    let list = qcBatches;
    if (selectedBatchId) {
      list = list.filter((b) => b.id === selectedBatchId);
    }
    return list;
  }, [qcBatches, selectedBatchId]);

  const totalPendingCount = React.useMemo(() => {
    let count = 0;
    qcBatches.forEach((batch) => {
      const clothingItems = getClothingByBatchId(batch.id);
      count += clothingItems.filter((c) => c.status === ClothingStatus.PENDING_QC).length;
    });
    return count;
  }, [qcBatches, getClothingByBatchId]);

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

  const handleQcSubmit = (result: string, description?: string) => {
    if (!selectedClothing) return;

    submitQc({
      batchId: selectedClothing.batchId,
      clothingId: selectedClothing.id,
      result: result as any,
      description,
      inspector: 'inspector_001',
    });

    setSelectedClothing(null);
  };

  return (
    <AppLayout
      activeKey="qc-board"
      onMenuSelect={handleMenuSelect}
      title="质检看板"
      subtitle="按批次进行质检操作，支持批量通知取件"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="lg">
            待质检：{totalPendingCount} 件
          </Badge>
          <Button variant="accent" onClick={() => setShowNotify(true)} disabled={totalPendingCount === 0}>
            <Bell className="w-4 h-4 mr-1" />
            批量通知
          </Button>
        </div>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="flex-1 min-w-0">
          <div className="mb-3">
            <Select
              label="按批次筛选"
              options={batchOptions}
              value={selectedBatchId}
              onChange={setSelectedBatchId}
            />
          </div>

          <div className="h-full overflow-y-auto pr-2 space-y-5">
            {visibleBatches.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="暂无待质检批次"
                description="请等待洗护完成后进行质检"
              />
            ) : (
              visibleBatches.map((batch) => {
                const clothingItems = getClothingByBatchId(batch.id);
                const pending = clothingItems.filter((c) =>
                  c.status === ClothingStatus.PENDING_QC
                );
                if (pending.length === 0) return null;

                return (
                  <div key={batch.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        {batch.batchNo}
                        <span className="text-slate-400 font-normal ml-2">
                          {batch.customerName} · 剩余 {pending.length} 件
                        </span>
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {pending.map((item) => (
                        <QcClothingCard
                          key={item.id}
                          clothing={item}
                          selected={selectedClothing?.id === item.id}
                          onClick={() => setSelectedClothing(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <QcPanel
          visible={!!selectedClothing}
          clothing={selectedClothing}
          onClose={() => setSelectedClothing(null)}
          onSubmit={handleQcSubmit}
        />
      </div>

      <BatchNotifyModal
        open={showNotify}
        onClose={() => setShowNotify(false)}
        batches={qcBatches}
      />
    </AppLayout>
  );
}
