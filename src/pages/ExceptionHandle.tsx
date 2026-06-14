import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, Receipt, Lock, DollarSign, Inbox, RefreshCcw, Ban, CheckCircle2, ShieldAlert, Unlock } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { StatusTag } from '../components/ui/StatusTag';
import { EmptyState } from '../components/ui/EmptyState';
import { RewashModal } from '../components/exceptions/RewashModal';
import { CompensationModal } from '../components/exceptions/CompensationModal';
import { LockAuditTable } from '../components/exceptions/LockAuditTable';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { ClothingItem, Compensation as CompensationType, RewashRecord, LockRecord, FeeChange } from '../types';
import { ClothingStatus, RewashStatus, CompensationStatus, LockType, FeeChangeType } from '../types';
import { isRewashFailed } from '../utils/statusCalc';
import { getFeeChangeTypeLabel } from '../utils/statusCalc';

const TAB_ITEMS = [
  { key: 'qc', label: '质检异常', icon: AlertCircle },
  { key: 'rewash', label: '返洗处理', icon: RotateCcw },
  { key: 'compensation', label: '赔付审批', icon: Receipt },
  { key: 'lock', label: '锁定解锁', icon: Lock },
  { key: 'fee', label: '费用变更', icon: DollarSign },
];

interface QcExceptionItem {
  id: string;
  batchId: string;
  batchNo: string;
  clothing: ClothingItem;
  reason: string;
  reportTime: string;
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExceptionHandle() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const clothingItems = useAppStore((s) => s.clothingItems);
  const qcRecords = useAppStore((s) => s.qcRecords);
  const rewashRecords = useAppStore((s) => s.rewashRecords);
  const compensations = useAppStore((s) => s.compensations);
  const lockRecords = useAppStore((s) => s.lockRecords);
  const feeChanges = useAppStore((s) => s.feeChanges);
  const lockBatch = useAppStore((s) => s.lockBatch);
  const unlockBatch = useAppStore((s) => s.unlockBatch);
  const unlockByContext = useAppStore((s) => s.unlockByContext);
  const completeRewash = useAppStore((s) => s.completeRewash);
  const markRewashFailed = useAppStore((s) => s.markRewashFailed);

  const [activeTab, setActiveTab] = React.useState('qc');
  const [showRewash, setShowRewash] = React.useState(false);
  const [showCompensation, setShowCompensation] = React.useState(false);
  const [currentClothing, setCurrentClothing] = React.useState<ClothingItem | null>(null);
  const [currentCompensation, setCurrentCompensation] = React.useState<CompensationType | null>(null);
  const [compensationMode, setCompensationMode] = React.useState<'apply' | 'approve'>('apply');
  const [selectedLockBatchId, setSelectedLockBatchId] = React.useState('');
  const [unlockingRecord, setUnlockingRecord] = React.useState<LockRecord | null>(null);
  const [unlockReason, setUnlockReason] = React.useState('');

  const clothingByBatchId = React.useMemo(() => {
    const map: Record<string, ClothingItem[]> = {};
    clothingItems.forEach((c) => {
      if (!map[c.batchId]) map[c.batchId] = [];
      map[c.batchId].push(c);
    });
    return map;
  }, [clothingItems]);

  const qcDescriptionMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    qcRecords.forEach((r) => {
      if (r.description) {
        map[r.clothingId] = r.description;
      }
    });
    return map;
  }, [qcRecords]);

  const clothingMap = React.useMemo(() => {
    const map: Record<string, ClothingItem> = {};
    clothingItems.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clothingItems]);

  const batchNoMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    batches.forEach((b) => {
      map[b.id] = b.batchNo;
    });
    return map;
  }, [batches]);

  const qcExceptions: QcExceptionItem[] = React.useMemo(() => {
    const result: QcExceptionItem[] = [];
    batches.forEach((b) => {
      const items = clothingByBatchId[b.id] || [];
      items.forEach((c) => {
        if (c.status === ClothingStatus.QC_ABNORMAL || c.status === ClothingStatus.QC_FAILED || c.status === ClothingStatus.QC_EXCEPTION) {
          result.push({
            id: `${b.id}-${c.id}`,
            batchId: b.id,
            batchNo: b.batchNo,
            clothing: c,
            reason: qcDescriptionMap[c.id] || '',
            reportTime: formatDateTime(b.createdAt),
          });
        }
      });
    });
    return result;
  }, [batches, clothingByBatchId, qcDescriptionMap]);

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

  const handleStartRewash = (item: QcExceptionItem) => {
    setCurrentClothing(item.clothing);
    setShowRewash(true);
  };

  const handleApplyCompensation = (item: QcExceptionItem) => {
    setCurrentClothing(item.clothing);
    setCompensationMode('apply');
    setShowCompensation(true);
  };

  const handleApproveCompensation = (c: CompensationType) => {
    const cloth = clothingMap[c.clothingId] || null;
    setCurrentClothing(cloth);
    setCurrentCompensation(c);
    setCompensationMode('approve');
    setShowCompensation(true);
  };

  const handleLock = () => {
    if (!selectedLockBatchId) {
      alert('请先选择批次');
      return;
    }
    lockBatch(selectedLockBatchId, LockType.MANUAL, '异常锁定', 'manager');
    setSelectedLockBatchId('');
  };

  const handleUnlock = async (record: LockRecord) => {
    if (record.isUnlocked) return;
    setUnlockingRecord(record);
    setUnlockReason('');
  };

  const handleConfirmUnlock = () => {
    if (!unlockingRecord || !unlockReason.trim()) return;
    const role = useAuthStore.getState().currentRole || 'manager';
    unlockByContext(unlockingRecord.contextKey, role, unlockReason.trim());
    setUnlockingRecord(null);
    setUnlockReason('');
  };

  const handleCancelUnlock = () => {
    setUnlockingRecord(null);
    setUnlockReason('');
  };

  return (
    <AppLayout
      activeKey="exceptions"
      onMenuSelect={handleMenuSelect}
      title="异常处理"
      subtitle="处理质检异常、返洗、赔付、锁定解锁和费用变更"
    >
      <div className="space-y-4">
        <Tabs items={TAB_ITEMS} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === 'qc' && (
          <div className="overflow-x-auto">
            {qcExceptions.length === 0 ? (
              <EmptyState icon={Inbox} title="暂无质检异常" description="所有衣物质检正常" />
            ) : (
              <table className="w-full text-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">批次号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">衣物</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">异常原因</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">报告时间</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qcExceptions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-primary-600 font-medium">{item.batchNo}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{item.clothing.clothingType}</div>
                        <div className="text-xs text-slate-400">{item.clothing.barcode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.reason || '质检异常'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.reportTime}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleStartRewash(item)}>
                            <RotateCcw className="w-3 h-3 mr-1" />返洗
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleApplyCompensation(item)}>
                            <DollarSign className="w-3 h-3 mr-1" />赔付
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'rewash' && (
          <div className="overflow-x-auto">
            {rewashRecords.length === 0 ? (
              <EmptyState icon={Inbox} title="暂无返洗记录" description="所有衣物无需返洗" />
            ) : (
              <table className="w-full text-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">返洗编号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">衣物条码</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">返洗原因</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">返洗次数</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">记录时间</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewashRecords.map((r: RewashRecord) => {
                    const clothing = clothingMap[r.clothingId];
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-primary-600">{r.id}</td>
                        <td className="px-4 py-3 text-slate-700 font-mono">{r.clothingId}</td>
                        <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                        <td className="px-4 py-3">
                          <StatusTag status={r.status} statusMap={{
                            [RewashStatus.PENDING]: { label: '待返洗', variant: 'warning' },
                            [RewashStatus.PROCESSING]: { label: '返洗中', variant: 'info' },
                            [RewashStatus.COMPLETED]: { label: '已完成', variant: 'success' },
                            [RewashStatus.FAILED]: { label: '返洗失败', variant: 'danger' },
                          }} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          第 {clothing?.rewashCount ?? 0} 次
                          {clothing?.rewashFailedCount > 0 && (
                            <span className="text-red-600 font-medium ml-2">({clothing.rewashFailedCount} 次失败)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          {r.status === RewashStatus.PROCESSING && (
                            <div className="flex justify-center gap-1">
                              <Button 
                                variant="success" 
                                size="sm" 
                                onClick={() => completeRewash(r.clothingId, 'manager', '返洗完成')}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />完成
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => markRewashFailed(r.clothingId, 'manager', '返洗失败，无法恢复')}
                              >
                                <Ban className="w-3 h-3 mr-1" />失败
                              </Button>
                            </div>
                          )}
                          {r.status === RewashStatus.PENDING && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setCurrentClothing(clothing || null);
                                setShowRewash(true);
                              }}
                            >
                              <RefreshCcw className="w-3 h-3 mr-1" />开始返洗
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'compensation' && (
          <div className="overflow-x-auto">
            {compensations.length === 0 ? (
              <EmptyState icon={Inbox} title="暂无赔付记录" description="暂无赔付申请或审批" />
            ) : (
              <table className="w-full text-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">赔付编号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">衣物条码</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">申请金额</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">审批金额</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">原因</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compensations.map((c: CompensationType) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-primary-600">{c.id}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{c.clothingId}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">¥{c.applyAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-success-600">
                        {c.approveAmount !== undefined ? `¥${c.approveAmount.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{c.reason}</td>
                      <td className="px-4 py-3">
                        <StatusTag status={c.status} statusMap={{
                          [CompensationStatus.PENDING]: { label: '待审批', variant: 'warning' },
                          [CompensationStatus.APPROVED]: { label: '已赔付', variant: 'success' },
                          [CompensationStatus.REJECTED]: { label: '已驳回', variant: 'danger' },
                        }} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.status === CompensationStatus.PENDING && (
                          <Button variant="outline" size="sm" onClick={() => handleApproveCompensation(c)}>
                            审批
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'lock' && (
          <div className="space-y-4">
            <LockAuditTable
              records={lockRecords}
              batchNoMap={batchNoMap}
              onUnlock={handleUnlock}
            />

            <div className="pt-2">
              <h3 className="text-sm font-medium text-slate-700 mb-2">快速锁定</h3>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                  value={selectedLockBatchId}
                  onChange={(e) => setSelectedLockBatchId(e.target.value)}
                >
                  <option value="">选择批次...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batchNo} - {b.customerName}</option>
                  ))}
                </select>
                <Button variant="danger" onClick={handleLock}>
                  <Lock className="w-4 h-4 mr-1.5" />
                  锁定批次
                </Button>
              </div>
            </div>

            {unlockingRecord && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-[440px] p-5 space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    解锁确认
                  </div>
                  <div className="text-sm text-slate-600 space-y-1.5">
                    <p>
                      <span className="text-slate-500">锁定对象：</span>
                      <span className="font-mono">
                        {unlockingRecord.batchId
                          ? (batchNoMap[unlockingRecord.batchId] || unlockingRecord.batchId)
                          : `[${unlockingRecord.contextKey}]`}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">锁定原因：</span>
                      {unlockingRecord.reason}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="text-red-500">*</span> 解锁原因（必填，将记录在审计日志）
                    </label>
                    <textarea
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      placeholder="请填写解锁原因，如：顾客身份已核实、系统自动锁定超时解除等"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={handleCancelUnlock}>
                      取消
                    </Button>
                    <Button onClick={handleConfirmUnlock} disabled={!unlockReason.trim()}>
                      <Unlock className="w-4 h-4 mr-1.5" />
                      确认解锁
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fee' && (
          <div className="overflow-x-auto">
            {feeChanges.length === 0 ? (
              <EmptyState icon={Inbox} title="暂无费用变更记录" description="暂无费用调整记录" />
            ) : (
              <table className="w-full text-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">变更编号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">批次号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">类型</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">变更金额</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">原因</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">操作员</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeChanges.map((f: FeeChange) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-primary-600">{f.id}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{batchNoMap[f.batchId] || f.batchId}</td>
                      <td className="px-4 py-3">
                        <StatusTag status={f.changeType} statusMap={{
                          [FeeChangeType.DISCOUNT]: { label: '折扣', variant: 'success' },
                          [FeeChangeType.REDUCTION]: { label: '减免', variant: 'warning' },
                          [FeeChangeType.OVERDUE]: { label: '超期费', variant: 'danger' },
                          [FeeChangeType.ADJUST]: { label: '调整', variant: 'info' },
                          [FeeChangeType.COMPENSATION]: { label: '赔付', variant: 'success' },
                          [FeeChangeType.CORRECTION]: { label: '冲正', variant: 'warning' },
                          [FeeChangeType.DAYCLOSE_ADJUST]: { label: '日结调整', variant: 'info' },
                        }} />
                      </td>
                      <td className={'px-4 py-3 text-right font-mono font-semibold ' + (f.amount < 0 ? 'text-success-600' : 'text-danger-600')}>
                        {f.amount < 0 ? '-' : ''}¥{Math.abs(f.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.reason}</td>
                      <td className="px-4 py-3 text-slate-600">{f.operator || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(f.operateTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <RewashModal
        open={showRewash}
        onClose={() => setShowRewash(false)}
        clothing={currentClothing}
        onRewashed={() => {}}
      />

      <CompensationModal
        open={showCompensation}
        onClose={() => setShowCompensation(false)}
        clothingPreview={
          currentClothing
            ? [
                {
                  barcode: currentClothing.barcode,
                  clothingType: currentClothing.clothingType,
                  color: currentClothing.color,
                  valuation: currentClothing.valuation,
                },
              ]
            : undefined
        }
        initial={{
          applyAmount: currentCompensation?.applyAmount,
          applyReason: currentCompensation?.reason,
          status: currentCompensation?.status,
        }}
        mode={compensationMode}
        onSubmit={async (data) => {
          console.log('Compensation submitted:', data);
        }}
      />
    </AppLayout>
  );
}
