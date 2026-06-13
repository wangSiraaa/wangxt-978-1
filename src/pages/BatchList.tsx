import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GitBranch, Search, Filter } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, type SelectOption } from '../components/ui/Select';
import { BatchTable } from '../components/batch/BatchTable';
import { BatchDetailDrawer } from '../components/batch/BatchDetailDrawer';
import { CreateBatchModal } from '../components/batch/CreateBatchModal';
import { SplitBatchModal } from '../components/batch/SplitBatchModal';
import { useAppStore } from '../store/useAppStore';
import type { Batch } from '../types';
import { BatchStatus } from '../types';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: '全部状态' },
  { value: 'PENDING_QC', label: '待质检' },
  { value: 'QC_PARTIAL', label: '部分质检' },
  { value: 'QC_FAILED', label: '质检异常' },
  { value: 'READY', label: '待取件' },
  { value: 'OVERDUE', label: '已超期' },
  { value: 'PARTIAL_PICKED', label: '部分取件' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'LOCKED', label: '已锁定' },
];

export default function BatchList() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const searchBatches = useAppStore((s) => s.searchBatches);
  const initDemoData = useAppStore((s) => s.initDemoData);
  const recalculateAllBatchStatuses = useAppStore((s) => s.recalculateAllBatchStatuses);

  const [keyword, setKeyword] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [selectedBatch, setSelectedBatch] = React.useState<Batch | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showSplit, setShowSplit] = React.useState(false);

  React.useEffect(() => {
    initDemoData();
    recalculateAllBatchStatuses();
  }, [initDemoData, recalculateAllBatchStatuses]);

  const filteredBatches = React.useMemo(() => {
    return searchBatches(keyword, statusFilter ? statusFilter as BatchStatus : undefined);
  }, [batches, keyword, statusFilter, searchBatches]);

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

  return (
    <AppLayout
      activeKey="batches"
      onMenuSelect={handleMenuSelect}
      title="批次列表"
      subtitle="管理所有洗护批次，支持搜索、筛选、新建和拆分"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSplit(true)} disabled={!selectedBatch}>
            <GitBranch className="w-4 h-4 mr-1" />
            批次拆分
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            新建批次
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-72">
            <Input
              placeholder="搜索批次号/顾客/电话/取件码"
              icon={Search}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              label="状态筛选"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        <BatchTable
          batches={filteredBatches}
          selectedBatchId={selectedBatch?.id}
          onSelect={setSelectedBatch}
        />

        <BatchDetailDrawer
          open={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          batch={selectedBatch}
        />

        <CreateBatchModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />

        <SplitBatchModal
          open={showSplit}
          onClose={() => setShowSplit(false)}
          batch={selectedBatch}
          onSplit={() => setShowSplit(false)}
        />
      </div>
    </AppLayout>
  );
}
