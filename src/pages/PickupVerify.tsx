import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, CheckCircle, AlertTriangle, Inbox, Shield } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PickupSearchForm } from '../components/pickup/PickupSearchForm';
import { PickupResultCard } from '../components/pickup/PickupResultCard';
import { LockWarning } from '../components/pickup/LockWarning';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Batch, LockRecord } from '../types';

type SearchStatus = 'idle' | 'found' | 'not-found' | 'locked';

export default function PickupVerify() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.currentRole);
  const verifyPickupInput = useAppStore((s) => s.verifyPickupInput);
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const getFailedAttemptsByContext = useAppStore((s) => s.getFailedAttemptsByContext);
  const isContextLocked = useAppStore((s) => s.isContextLocked);
  const getLockRecordByContext = useAppStore((s) => s.getLockRecordByContext);
  const unlockByContext = useAppStore((s) => s.unlockByContext);
  const initDemoData = useAppStore((s) => s.initDemoData);

  const [searchStatus, setSearchStatus] = React.useState<SearchStatus>('idle');
  const [foundBatches, setFoundBatches] = React.useState<Batch[]>([]);
  const [clothingMap, setClothingMap] = React.useState<Record<string, any[]>>({});
  const [currentContext, setCurrentContext] = React.useState<string>('');
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockRecord, setLockRecord] = React.useState<LockRecord | null>(null);
  const [unlockReason, setUnlockReason] = React.useState('');
  const [showUnlockForm, setShowUnlockForm] = React.useState(false);

  React.useEffect(() => {
    initDemoData();
  }, [initDemoData]);

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

  const handleSearch = async (type: 'phone' | 'code', value: string) => {
    const result = verifyPickupInput(type, value);
    const contextKey = result.contextKey;
    setCurrentContext(contextKey);

    const contextLocked = isContextLocked(contextKey);
    const contextLock = getLockRecordByContext(contextKey);

    if (result.isLocked || contextLocked) {
      setSearchStatus('locked');
      setFailedAttempts(getFailedAttemptsByContext(contextKey));
      setLockRecord(contextLock || getLockRecordByContext(contextKey));
      setFoundBatches([]);
      setClothingMap({});
      return;
    }

    if (result.success && result.matchedBatches.length > 0) {
      const map: Record<string, any[]> = {};
      result.matchedBatches.forEach((b) => {
        map[b.id] = getClothingByBatchId(b.id);
      });
      setFoundBatches(result.matchedBatches);
      setClothingMap(map);
      setSearchStatus('found');
      setFailedAttempts(0);
      setLockRecord(null);
    } else {
      setFoundBatches([]);
      setClothingMap({});
      setSearchStatus('not-found');
      setFailedAttempts(getFailedAttemptsByContext(contextKey));
      setLockRecord(null);
    }
  };

  const handleUnlock = () => {
    if (!currentContext || !unlockReason.trim()) return;
    const currentRole = useAuthStore.getState().currentRole || 'manager';
    unlockByContext(currentContext, currentRole, unlockReason.trim());
    const refreshed = getLockRecordByContext(currentContext);
    setLockRecord(refreshed);
    if (!refreshed) {
      setSearchStatus('idle');
      setFailedAttempts(0);
    }
    setShowUnlockForm(false);
    setUnlockReason('');
  };

  const handlePickup = (batchId: string, clothingIds: string[]) => {
    navigate('/cashier');
  };

  const handleFeeTrial = () => {
    navigate('/cashier');
  };

  const handleConfirmPickup = () => {
    navigate('/cashier');
  };

  const showCashierActions = role === 'cashier' || role === 'manager' || role === 'staff';
  const canUnlock = role === 'manager';

  return (
    <AppLayout
      activeKey="pickup-verify"
      onMenuSelect={handleMenuSelect}
      title="取件校验"
      subtitle="输入取件码或手机号验证顾客取件"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        <div className="space-y-4">
          <PickupSearchForm
            onSearch={handleSearch}
          />

          {showCashierActions && foundBatches.length > 0 && searchStatus === 'found' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleFeeTrial}>
                <Calculator className="w-4 h-4 mr-1.5" />
                费用试算
              </Button>
              <Button variant="success" onClick={handleConfirmPickup}>
                <CheckCircle className="w-4 h-4 mr-1.5" />
                确认取件
              </Button>
            </div>
          )}

          {canUnlock && showUnlockForm && (
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                解锁操作（审计留痕）
              </h4>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="请填写解锁原因（必填，将记录在审计日志）"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUnlockForm(false)}>
                  取消
                </Button>
                <Button onClick={handleUnlock} disabled={!unlockReason.trim()}>
                  确认解锁
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto pr-2">
          {searchStatus === 'locked' || lockRecord ? (
            <div className="space-y-3">
              <LockWarning
                failedAttempts={failedAttempts}
                maxAttempts={3}
                lockRecord={lockRecord}
              />
              {canUnlock && !showUnlockForm && (
                <Button variant="outline" onClick={() => setShowUnlockForm(true)} className="w-full">
                  <Shield className="w-4 h-4 mr-1.5" />
                  店长解锁（需填写原因）
                </Button>
              )}
            </div>
          ) : searchStatus === 'idle' ? (
            <EmptyState
              icon={Inbox}
              title="请输入查询信息"
              description="在左侧输入取件码或手机号，查询取件信息"
            />
          ) : searchStatus === 'not-found' ? (
            <EmptyState
              icon={AlertTriangle}
              title="未找到匹配的批次"
              description={
                failedAttempts > 0
                  ? `已失败 ${failedAttempts} 次，连续失败 3 次将锁定`
                  : '请检查取件码或手机号是否正确'
              }
              variant="warning"
            />
          ) : (
            <PickupResultCard
              batches={foundBatches}
              clothingMap={clothingMap}
              onPickup={handlePickup}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
