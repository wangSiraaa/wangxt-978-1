import * as React from 'react';
import { cn } from '../../lib/utils';
import { X, Clock, User, Phone, Calendar, Tag, AlertCircle, Diamond } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import type { Batch, ClothingItem, QcRecord } from '../../types';
import { BatchStatus, ClothingQcStatus } from '../../types';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getBatchStatusLabel(status: BatchStatus): string {
  const map: Record<BatchStatus, string> = {
    [BatchStatus.PENDING_QC]: '待质检',
    [BatchStatus.QC_PARTIAL]: '部分质检',
    [BatchStatus.QC_FAILED]: '质检异常',
    [BatchStatus.READY]: '待取件',
    [BatchStatus.OVERDUE]: '已超期',
    [BatchStatus.PARTIAL_PICKED]: '部分取件',
    [BatchStatus.COMPLETED]: '已完成',
    [BatchStatus.LOCKED]: '已锁定',
  };
  return map[status] || status;
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

const COLOR_RISK_STYLES: Record<string, string> = {
  无: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  低: 'bg-amber-100 text-amber-700 border-amber-200',
  中: 'bg-orange-100 text-orange-700 border-orange-200',
  高: 'bg-red-100 text-red-700 border-red-200',
  易染色: 'bg-red-100 text-red-700 border-red-200',
  易褪色: 'bg-orange-100 text-orange-700 border-orange-200',
};

export interface BatchDetailDrawerProps {
  open: boolean;
  batch: Batch | null;
  onClose: () => void;
  className?: string;
}

const TIMELINE_STEPS = [
  { key: 'created', label: '创建批次', icon: Calendar },
  { key: 'washing', label: '洗涤中', icon: Clock },
  { key: 'qc', label: '质检', icon: AlertCircle },
  { key: 'ready', label: '待取件', icon: Tag },
  { key: 'completed', label: '已完成', icon: User },
];

export const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({
  open,
  batch,
  onClose,
  className,
}) => {
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);
  const qcRecords = useAppStore((s) => s.qcRecords);

  const getQcByClothingId = React.useCallback(
    (clothingId: string): QcRecord[] => {
      return qcRecords.filter((r) => r.clothingId === clothingId);
    },
    [qcRecords]
  );

  const clothingItems = batch ? getClothingByBatchId(batch.id) : [];

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const getTimelineActiveIndex = (status: BatchStatus): number => {
    switch (status) {
      case BatchStatus.PENDING_QC:
        return 1;
      case BatchStatus.QC_PARTIAL:
      case BatchStatus.QC_FAILED:
        return 2;
      case BatchStatus.READY:
      case BatchStatus.OVERDUE:
      case BatchStatus.PARTIAL_PICKED:
        return 3;
      case BatchStatus.COMPLETED:
        return 4;
      default:
        return 0;
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 z-40"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col',
          className
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">批次详情</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{batch?.batchNo || '-'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!batch ? (
            <div className="h-full">
              <EmptyState title="批次不存在" description="未找到该批次的详细信息" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                </CardHeader>
                <CardBody className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500 text-xs">顾客</div>
                      <div className="font-medium text-slate-900">{batch.customerName}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500 text-xs">手机号</div>
                      <div className="font-medium text-slate-900 tabular-nums">{batch.customerPhone}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500 text-xs">取件码</div>
                      <div className="font-mono font-medium text-primary-700 text-lg tracking-wider">{batch.pickupCode}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">状态</div>
                    <StatusTag status={getBatchStatusLabel(batch.status)} type="batch" />
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500 text-xs">创建时间</div>
                      <div className="text-slate-900 tabular-nums text-sm">{formatDate(batch.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500 text-xs">预计完成</div>
                      <div className="text-slate-900 tabular-nums text-sm">{formatDate(batch.expectedTime)}</div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>状态流转</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
                    <div className="space-y-5">
                      {TIMELINE_STEPS.map((step, idx) => {
                        const activeIdx = getTimelineActiveIndex(batch.status);
                        const isActive = idx <= activeIdx;
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="relative flex items-start gap-4">
                            <div
                              className={cn(
                                'relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2',
                                isActive
                                  ? 'bg-primary-500 border-primary-500 text-white'
                                  : 'bg-white border-slate-300 text-slate-400'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="pt-0.5">
                              <div className={cn('text-sm font-medium', isActive ? 'text-slate-900' : 'text-slate-400')}>
                                {step.label}
                              </div>
                              {isActive && idx === activeIdx && (
                                <div className="text-xs text-slate-500 mt-0.5">当前状态</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>衣物清单</CardTitle>
                    <Badge variant="primary">{clothingItems.length} 件</Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {clothingItems.length === 0 ? (
                    <EmptyState title="暂无衣物" description="该批次未录入衣物信息" />
                  ) : (
                    clothingItems.map((cloth) => (
                      <ClothingCard key={cloth.id} cloth={cloth} qcRecords={getQcByClothingId(cloth.id)} />
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>费用明细</CardTitle>
                </CardHeader>
                <CardBody className="space-y-3">
                  <FeeRow label="基础费用" amount={batch.totalBaseFee} />
                  {batch.totalOverdueFee > 0 && (
                    <FeeRow label="超期费用" amount={batch.totalOverdueFee} />
                  )}
                  {batch.discountAmount > 0 && (
                    <FeeRow label="折扣/减免" amount={-batch.discountAmount} isNegative />
                  )}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">应付金额</span>
                    <span className="text-xl font-bold text-primary-600 tabular-nums">¥ {batch.finalAmount.toFixed(2)}</span>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>操作日志</CardTitle>
                </CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-slate-600">创建批次</span>
                      <span className="text-slate-400 ml-2">由 {batch.createdBy}</span>
                    </div>
                    <span className="text-slate-500 tabular-nums">{formatDate(batch.createdAt)}</span>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </>
  );
};

interface ClothingCardProps {
  cloth: ClothingItem;
  qcRecords: any[];
}

const ClothingCard: React.FC<ClothingCardProps> = ({ cloth, qcRecords }) => {
  const riskStyle = COLOR_RISK_STYLES[cloth.colorRisk] || COLOR_RISK_STYLES['无'];

  return (
    <div className="p-4 border border-slate-200 rounded-md hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          <Tag className="w-6 h-6 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900">{cloth.clothingType}</span>
            <span className="text-xs font-mono text-slate-500">{cloth.barcode}</span>
            {cloth.isValuable && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                <Diamond className="w-3 h-3" /> 贵重
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="slate" className="text-xs">{cloth.color}</Badge>
            <Badge className={cn('text-xs border', riskStyle)}>
              色险: {cloth.colorRisk}
            </Badge>
            <StatusTag status={getQcStatusLabel(cloth.qcStatus)} type="qc" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-slate-500">
              {cloth.washProject} · 估值 ¥{cloth.valuation}
            </div>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">
              ¥ {cloth.basePrice.toFixed(2)}
            </div>
          </div>
          {qcRecords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              最近质检：{qcRecords[qcRecords.length - 1]?.description || '无备注'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FeeRowProps {
  label: string;
  amount: number;
  isNegative?: boolean;
}

const FeeRow: React.FC<FeeRowProps> = ({ label, amount, isNegative }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-600">{label}</span>
    <span className={cn('tabular-nums font-medium', isNegative ? 'text-success-600' : 'text-slate-900')}>
      {isNegative ? '-' : ''}¥ {Math.abs(amount).toFixed(2)}
    </span>
  </div>
);
