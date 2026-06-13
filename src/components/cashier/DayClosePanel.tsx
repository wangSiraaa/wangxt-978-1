import * as React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StatusTag } from '../ui/StatusTag';
import {
  CalendarDays,
  Receipt,
  Clock,
  Percent,
  MinusCircle,
  CreditCard,
  Lock,
  FileText,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { Batch } from '../../types';

export interface DayCloseSummary {
  transactionCount: number;
  baseFee: number;
  overdueFee: number;
  discount: number;
  packageDeduction: number;
  reduction: number;
  actualReceived: number;
}

export interface DayCloseBatchItem {
  batch: Batch;
  items: { id: string; barcode: string; clothingType: string; price: number }[];
  baseFee: number;
  overdueFee: number;
  discount: number;
  reduction: number;
  actual: number;
  paidAt: Date;
  cashier: string;
}

export interface DayClosePanelProps {
  date?: Date;
  summary: DayCloseSummary;
  batchItems: DayCloseBatchItem[];
  isClosed: boolean;
  onCloseDay?: () => Promise<void> | void;
  className?: string;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const DayClosePanel: React.FC<DayClosePanelProps> = ({
  date = new Date(),
  summary,
  batchItems,
  isClosed,
  onCloseDay,
  className,
}) => {
  const { currentUser } = useAuthStore();
  const [confirming, setConfirming] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  const handleCloseDay = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setClosing(true);
    try {
      await onCloseDay?.();
      setConfirming(false);
    } finally {
      setClosing(false);
    }
  };

  const summaryCards = [
    {
      key: 'count',
      label: '交易笔数',
      value: summary.transactionCount,
      unit: '笔',
      icon: Receipt,
      tone: 'text-slate-700 bg-slate-50 border-slate-200',
      iconTone: 'text-slate-500',
      valueTone: 'text-slate-900',
    },
    {
      key: 'base',
      label: '基础费用',
      value: summary.baseFee,
      unit: '元',
      icon: FileText,
      tone: 'text-slate-700 bg-slate-50 border-slate-200',
      iconTone: 'text-slate-500',
      valueTone: 'text-slate-900',
    },
    {
      key: 'overdue',
      label: '超期费用',
      value: summary.overdueFee,
      unit: '元',
      icon: Clock,
      tone: 'text-amber-800 bg-amber-50 border-amber-200',
      iconTone: 'text-amber-600',
      valueTone: 'text-amber-700',
    },
    {
      key: 'discount',
      label: '会员折扣',
      value: summary.discount,
      unit: '元',
      icon: Percent,
      tone: 'text-success-800 bg-success-50 border-success-200',
      iconTone: 'text-success-600',
      valueTone: 'text-success-700',
    },
    {
      key: 'reduction',
      label: '费用减免',
      value: summary.reduction,
      unit: '元',
      icon: MinusCircle,
      tone: 'text-danger-800 bg-danger-50 border-danger-200',
      iconTone: 'text-danger-600',
      valueTone: 'text-danger-700',
    },
    {
      key: 'actual',
      label: '实收金额',
      value: summary.actualReceived,
      unit: '元',
      icon: CreditCard,
      tone: 'text-primary-800 bg-primary-50 border-primary-200',
      iconTone: 'text-primary-600',
      valueTone: 'text-primary-700',
    },
  ];

  return (
    <div className={cn('space-y-5', className)}>
      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            日结面板 · {formatDay(date)}
            {isClosed && (
              <Badge variant="slate" className="ml-2 flex items-center gap-1">
                <Lock className="w-3 h-3" /> 已锁账
              </Badge>
            )}
          </CardTitle>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            操作员：<span className="font-medium text-slate-700">{currentUser?.name || '-'}</span>
          </div>
        </CardHeader>
        <CardBody className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {summaryCards.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className={cn('p-3 rounded-md border', s.tone)}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={cn('w-3.5 h-3.5', s.iconTone)} />
                    <span className="text-[11px]">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-xl font-bold tabular-nums', s.valueTone)}>
                      {typeof s.value === 'number' && s.unit === '元'
                        ? s.value.toFixed(2)
                        : s.value}
                    </span>
                    <span className="text-[10px] opacity-70">{s.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            当日交易明细
            <Badge variant="slate">{batchItems.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {batchItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              当日暂无结算交易
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {batchItems.map((item) => (
                <div key={item.batch.id} className="px-5 py-3">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {item.batch.batchNo}
                      </span>
                      <span className="text-sm text-slate-700">{item.batch.customerName}</span>
                      <StatusTag status={item.batch.status} type="batch" />
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {formatDate(item.paidAt)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        收银：{item.cashier}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold tabular-nums text-slate-900">
                        ¥{item.actual.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        {item.items.length} 件
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {item.items.map((cl) => (
                      <Badge key={cl.id} variant="slate" className="text-[10px] py-0.5">
                        <span className="font-mono mr-1">{cl.barcode}</span>
                        {cl.clothingType}
                        <span className="text-slate-400 ml-1">¥{cl.price.toFixed(0)}</span>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2 pl-1 text-[11px] text-slate-500 tabular-nums">
                    <span>基础：¥{item.baseFee.toFixed(2)}</span>
                    {item.overdueFee > 0 && (
                      <span className="text-amber-600">超期：+¥{item.overdueFee.toFixed(2)}</span>
                    )}
                    {item.discount > 0 && (
                      <span className="text-success-600">折扣：-¥{item.discount.toFixed(2)}</span>
                    )}
                    {item.reduction > 0 && (
                      <span className="text-danger-600">减免：-¥{item.reduction.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
        <CardFooter className="bg-slate-50 border-t border-slate-200">
          {isClosed ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Lock className="w-4 h-4 text-slate-500" />
              当日账已锁定，无法再进行收银操作
            </div>
          ) : confirming ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex-1">
                <AlertTriangle className="w-4 h-4" />
                确认锁账后将无法进行当日收银、减免等操作，请再次确认
              </div>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={closing}>
                取消
              </Button>
              <Button variant="danger" onClick={handleCloseDay} loading={closing}>
                <Check className="w-4 h-4 mr-1" />
                确认锁账
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={handleCloseDay} disabled={batchItems.length === 0}>
              <Lock className="w-4 h-4 mr-1.5" />
              完成日结 · 锁账
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
