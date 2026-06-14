import * as React from 'react';
import { cn } from '../../lib/utils';
import { X, Clock, User, Phone, Calendar, Tag, AlertCircle, Diamond, ChevronDown, ChevronUp, AlertTriangle, RotateCcw, Send, ArrowRight, Ban } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import type { Batch, ClothingItem, QcRecord, Compensation, FeeChange } from '../../types';
import { BatchStatus, ClothingQcStatus, FeeChangeType } from '../../types';
import { getClothingStatusLabel, getClothingStatusColor, getClothStatusRiskLevel, getFeeChangeTypeLabel, isRewashFailed } from '../../utils/statusCalc';
import { getWashProjectName } from '../../utils/feeCalc';

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
  const compensations = useAppStore((s) => s.compensations);
  const feeChanges = useAppStore((s) => s.feeChanges);
  const calculateBatchFee = useAppStore((s) => s.calculateBatchFee);

  const getQcByClothingId = React.useCallback(
    (clothingId: string): QcRecord[] => {
      return qcRecords.filter((r) => r.clothingId === clothingId);
    },
    [qcRecords]
  );

  const getCompensationsByClothingId = React.useCallback(
    (clothingId: string): Compensation[] => {
      return compensations.filter((c) => c.clothingId === clothingId);
    },
    [compensations]
  );

  const clothingItems = batch ? getClothingByBatchId(batch.id) : [];
  const batchFeeChanges = batch ? feeChanges.filter((f) => f.batchId === batch.id) : [];
  const batchCompensations = batch ? compensations.filter((c) => c.batchId === batch.id) : [];
  const feeBreakdown = batch ? calculateBatchFee(batch.id) : null;

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
                      <ClothingCard 
                        key={cloth.id} 
                        cloth={cloth} 
                        qcRecords={getQcByClothingId(cloth.id)} 
                        compensations={getCompensationsByClothingId(cloth.id)}
                      />
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>费用明细</CardTitle>
                    {batch.isDayClosed && (
                      <Badge variant="success" className="text-[10px]">已日结</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {feeBreakdown ? (
                    <>
                      <FeeRow label="基础费用" amount={feeBreakdown.baseAmount} />
                      {feeBreakdown.packageDiscount > 0 && (
                        <FeeRow label="套餐优惠" amount={-feeBreakdown.packageDiscount} isNegative />
                      )}
                      {feeBreakdown.memberDiscount > 0 && (
                        <FeeRow label="会员折扣" amount={-feeBreakdown.memberDiscount} isNegative />
                      )}
                      {feeBreakdown.overdueFee > 0 && (
                        <FeeRow label="超期费用" amount={feeBreakdown.overdueFee} />
                      )}
                      {feeBreakdown.reductionAmount > 0 && (
                        <FeeRow label="减免金额" amount={-feeBreakdown.reductionAmount} isNegative />
                      )}
                      {feeBreakdown.compensationAmount > 0 && (
                        <FeeRow label="赔付金额" amount={-feeBreakdown.compensationAmount} isNegative />
                      )}
                      {batch.isDayClosed && feeBreakdown.totalAdjust !== 0 && (
                        <FeeRow 
                          label={feeBreakdown.totalAdjust > 0 ? "日结调整(增)" : "日结调整(减)"} 
                          amount={feeBreakdown.totalAdjust} 
                          isNegative={feeBreakdown.totalAdjust < 0} 
                        />
                      )}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">应付金额</span>
                        <span className="text-xl font-bold text-primary-600 tabular-nums">¥ {feeBreakdown.finalAmount.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </CardBody>
              </Card>

              {batchFeeChanges.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>费用调整记录</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {batchFeeChanges.map((change) => (
                      <div key={change.id} className="text-sm p-3 bg-slate-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-900 font-medium">
                            {getFeeChangeTypeLabel(change.changeType)}
                          </span>
                          <span className={cn(
                            'tabular-nums font-medium',
                            change.amount < 0 ? 'text-success-600' : 'text-slate-900'
                          )}>
                            {change.amount < 0 ? '-' : ''}¥ {Math.abs(change.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(change.createdAt)} · 操作人: {change.operator}
                        </div>
                        {change.reason && (
                          <div className="text-xs text-slate-400 mt-1">原因: {change.reason}</div>
                        )}
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}

              {batchCompensations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>赔付记录</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {batchCompensations.map((comp) => (
                      <div key={comp.id} className="text-sm p-3 bg-slate-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-900 font-medium">
                            ¥{comp.amount.toFixed(2)}
                          </span>
                          <Badge variant={comp.status === 'APPROVED' ? 'success' : comp.status === 'REJECTED' ? 'danger' : 'warning'} className="text-[10px]">
                            {comp.status === 'APPROVED' ? '已赔付' : comp.status === 'REJECTED' ? '已驳回' : '待审批'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(comp.createdAt)} · 操作人: {comp.createdBy}
                        </div>
                        {comp.reason && (
                          <div className="text-xs text-slate-400 mt-1">原因: {comp.reason}</div>
                        )}
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}

              {batch.isDayClosed && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-amber-800">已日结锁定</div>
                      <div className="text-xs text-amber-600 mt-0.5">该批次已完成日结，费用和状态已锁定。如需调整，只能生成日结调整记录。</div>
                    </div>
                  </div>
                </div>
              )}

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
  qcRecords: QcRecord[];
  compensations: Compensation[];
}

const ClothingCard: React.FC<ClothingCardProps> = ({ cloth, qcRecords, compensations }) => {
  const [expanded, setExpanded] = React.useState(false);
  const riskStyle = COLOR_RISK_STYLES[cloth.colorRisk] || COLOR_RISK_STYLES['无'];
  const statusRisk = getClothStatusRiskLevel(cloth);
  const statusLabel = getClothingStatusLabel(cloth.status);
  const statusColor = getClothingStatusColor(cloth.status);
  const isRewashFailedStatus = isRewashFailed(cloth);

  const getRiskBadge = () => {
    if (statusRisk === 'danger') {
      return (
        <Badge className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className="w-3 h-3" /> 高风险
        </Badge>
      );
    }
    if (statusRisk === 'warning') {
      return (
        <Badge className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 bg-orange-100 text-orange-700 border-orange-200">
          <AlertTriangle className="w-3 h-3" /> 中风险
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className={cn(
      'p-4 border rounded-md transition-colors',
      isRewashFailedStatus 
        ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
        : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-16 h-16 rounded-md border flex items-center justify-center flex-shrink-0',
          cloth.isPickedUp 
            ? 'bg-success-100 border-success-200' 
            : isRewashFailedStatus 
              ? 'bg-red-100 border-red-200' 
              : 'bg-slate-100 border-slate-200'
        )}>
          {cloth.isPickedUp ? (
            <Ban className="w-6 h-6 text-success-500" />
          ) : (
            <Tag className={cn('w-6 h-6', isRewashFailedStatus ? 'text-red-400' : 'text-slate-400')} />
          )}
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
            {getRiskBadge()}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="slate" className="text-xs">{cloth.color}</Badge>
            <Badge className={cn('text-xs border', riskStyle)}>
              色险: {cloth.colorRisk}
            </Badge>
            <StatusTag status={getQcStatusLabel(cloth.qcStatus)} type="qc" />
            <Badge className={cn('text-xs border', statusColor)}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              返洗: {cloth.rewashCount} 次
              {cloth.rewashFailedCount > 0 && (
                <span className="text-red-600 font-medium">({cloth.rewashFailedCount} 次失败)</span>
              )}
            </span>
            {cloth.transferId && (
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3" />
                已调拨
              </span>
            )}
            {cloth.isPickedUp && (
              <span className="flex items-center gap-1 text-success-600 font-medium">
                已取走 ({formatDate(cloth.pickedUpAt)})
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-slate-500">
              {getWashProjectName(cloth.washProject)} · 估值 ¥{cloth.valuation}
            </div>
            <div className="text-sm font-semibold text-slate-900 tabular-nums">
              ¥ {cloth.basePrice.toFixed(2)}
            </div>
          </div>
          {compensations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-700 mb-1">赔付记录</div>
              {compensations.map((c) => (
                <div key={c.id} className="text-xs text-slate-500 flex justify-between">
                  <span>¥{c.amount.toFixed(2)} - {c.status === 'APPROVED' ? '已赔付' : c.status === 'REJECTED' ? '已驳回' : '待审批'}</span>
                  <span className="text-slate-400">{formatDate(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
          {qcRecords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              最近质检：{qcRecords[qcRecords.length - 1]?.description || '无备注'}
            </div>
          )}
          {cloth.statusHistory && cloth.statusHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {expanded ? '收起流转记录' : '查看完整流转记录'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          {expanded && cloth.statusHistory && cloth.statusHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-700 mb-2">状态流转历史</div>
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
                <div className="space-y-3">
                  {cloth.statusHistory.map((h, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-primary-500 border-2 border-white" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-medium">
                            {getClothingStatusLabel(h.fromStatus)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-900 font-medium">
                            {getClothingStatusLabel(h.toStatus)}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {formatDate(h.timestamp)} · 操作人: {h.operator}
                        </div>
                        {h.remark && (
                          <div className="text-slate-400 mt-0.5">备注: {h.remark}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
