import * as React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Calculator, Clock, Percent, Tag, MinusCircle, CreditCard, Receipt } from 'lucide-react';

export interface FeeBreakdownItem {
  label: string;
  amount: number;
  icon?: any;
  description?: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

export interface FeeBreakdownProps {
  baseFee: number;
  overdueFee?: number;
  overdueSteps?: { label: string; days: number; amount: number }[];
  discount?: number;
  packageDeduction?: number;
  reductions?: { reason: string; amount: number }[];
  reductionAmount?: number;
  payAmount: number;
  className?: string;
}

export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  baseFee,
  overdueFee = 0,
  overdueSteps,
  discount = 0,
  packageDeduction = 0,
  reductions,
  reductionAmount = 0,
  payAmount,
  className,
}) => {
  const totalReduction = reductionAmount + (reductions?.reduce((s, r) => s + r.amount, 0) || 0);

  return (
    <Card className={className}>
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary-500" />
          费用明细
        </CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-slate-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">基础费用</span>
            </div>
            <span className="text-sm font-semibold text-slate-800 tabular-nums">
              ¥{baseFee.toFixed(2)}
            </span>
          </div>

          {overdueFee > 0 && (
            <div className="px-4 py-3 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-800 font-medium">超期费用</span>
                </div>
                <span className="text-sm font-bold text-amber-700 tabular-nums">
                  +¥{overdueFee.toFixed(2)}
                </span>
              </div>
              {overdueSteps && overdueSteps.length > 0 && (
                <div className="mt-2 pl-6 space-y-1">
                  {overdueSteps.map((step, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-amber-700/80">
                      <span>{step.label} · {step.days}天</span>
                      <span className="tabular-nums">+¥{step.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {discount > 0 && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-success-500" />
                <span className="text-sm text-slate-600">会员折扣</span>
              </div>
              <span className="text-sm font-semibold text-success-600 tabular-nums">
                -¥{discount.toFixed(2)}
              </span>
            </div>
          )}

          {packageDeduction > 0 && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-500" />
                <span className="text-sm text-slate-600">套餐抵扣</span>
              </div>
              <span className="text-sm font-semibold text-primary-600 tabular-nums">
                -¥{packageDeduction.toFixed(2)}
              </span>
            </div>
          )}

          {totalReduction > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MinusCircle className="w-4 h-4 text-danger-500" />
                  <span className="text-sm text-slate-600">费用减免</span>
                </div>
                <span className="text-sm font-semibold text-danger-600 tabular-nums">
                  -¥{totalReduction.toFixed(2)}
                </span>
              </div>
              {reductions && reductions.length > 0 && (
                <div className="mt-2 pl-6 space-y-1">
                  {reductions.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[180px]">{r.reason}</span>
                      <span className="tabular-nums text-danger-500">-¥{r.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-4 bg-slate-900 text-white flex items-end justify-between">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                应付金额
              </div>
              <div className="text-3xl font-bold tabular-nums tracking-tight mt-0.5">
                ¥{payAmount.toFixed(2)}
              </div>
            </div>
            {payAmount < baseFee + overdueFee && (
              <Badge variant="success" className="text-[11px]">
                优惠 ¥{(baseFee + overdueFee - payAmount).toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
