import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, CheckCircle, AlertTriangle, Inbox } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PickupSearchForm } from '../components/pickup/PickupSearchForm';
import { PickupResultCard } from '../components/pickup/PickupResultCard';
import { LockWarning } from '../components/pickup/LockWarning';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Batch } from '../types';

type SearchStatus = 'idle' | 'found' | 'not-found' | 'locked';

export default function PickupVerify() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.currentRole);
  const verifyPickupCode = useAppStore((s) => s.verifyPickupCode);
  const verifyByPhone = useAppStore((s) => s.verifyByPhone);
  const getBatchById = useAppStore((s) => s.getBatchById);
  const getFailedAttempts = useAppStore((s) => s.getFailedAttempts);
  const isBatchLocked = useAppStore((s) => s.isBatchLocked);
  const lockRecords = useAppStore((s) => s.lockRecords);
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const initDemoData = useAppStore((s) => s.initDemoData);

  const [searchStatus, setSearchStatus] = React.useState<SearchStatus>('idle');
  const [foundBatches, setFoundBatches] = React.useState<Batch[]>([]);
  const [clothingMap, setClothingMap] = React.useState<Record<string, any[]>>({});
  const [currentBatchId, setCurrentBatchId] = React.useState<string>('');
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockRecord, setLockRecord] = React.useState<any>(null);

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
    if (type === 'code') {
      const allBatches = useAppStore.getState().batches;
      const batch = allBatches.find((b) => b.pickupCode === value);
      
      if (batch) {
        setCurrentBatchId(batch.id);
        const result = verifyPickupCode(batch.id, value);
        
        if (result.success) {
          const clothing = getClothingByBatchId(batch.id);
          setFoundBatches([batch]);
          setClothingMap({ [batch.id]: clothing });
          setSearchStatus('found');
          setFailedAttempts(0);
          setLockRecord(null);
        } else {
          setFoundBatches([]);
          setClothingMap({});
          setSearchStatus('not-found');
          setFailedAttempts(getFailedAttempts(batch.id));
          const batchLockRecords = lockRecords.filter((l) => l.batchId === batch.id && !l.isUnlocked);
          setLockRecord(batchLockRecords.length > 0 ? batchLockRecords[0] : null);
          if (result.isLocked) {
            setSearchStatus('locked');
          }
        }
      } else {
        setFoundBatches([]);
        setClothingMap({});
        setSearchStatus('not-found');
        setFailedAttempts((prev) => prev + 1);
        setLockRecord(null);
      }
    } else {
      const result = verifyByPhone(value);
      if (result && result.length > 0) {
        const map: Record<string, any[]> = {};
        result.forEach((b) => {
          map[b.id] = getClothingByBatchId(b.id);
        });
        setFoundBatches(result);
        setClothingMap(map);
        setCurrentBatchId(result[0].id);
        setSearchStatus('found');
        setFailedAttempts(0);
        setLockRecord(null);
      } else {
        setFoundBatches([]);
        setClothingMap({});
        setSearchStatus('not-found');
      }
    }
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
        </div>

        <div className="overflow-y-auto pr-2">
          {searchStatus === 'locked' || lockRecord ? (
            <LockWarning
              failedAttempts={failedAttempts}
              maxAttempts={5}
              lockRecord={lockRecord}
            />
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
                  ? `已失败 ${failedAttempts} 次，连续失败 5 次将锁定`
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
