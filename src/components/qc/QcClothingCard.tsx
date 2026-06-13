import * as React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Diamond, Image as ImageIcon, Tag, Check, X, AlertTriangle } from 'lucide-react';
import type { ClothingItem } from '../../types';
import { ClothingQcStatus } from '../../types';

const COLOR_RISK_BAR: Record<string, string> = {
  无: 'bg-emerald-400',
  低: 'bg-amber-400',
  中: 'bg-orange-400',
  高: 'bg-red-500',
  易染色: 'bg-red-500',
  易褪色: 'bg-orange-500',
};

const QC_CORNER_STYLE: Record<ClothingQcStatus, { bg: string; icon: any; label: string }> = {
  [ClothingQcStatus.NOT_INSPECTED]: { bg: 'bg-slate-400', icon: AlertTriangle, label: '待检' },
  [ClothingQcStatus.PASSED]: { bg: 'bg-success-500', icon: Check, label: '通过' },
  [ClothingQcStatus.FAILED]: { bg: 'bg-danger-500', icon: X, label: '失败' },
  [ClothingQcStatus.EXCEPTION]: { bg: 'bg-amber-500', icon: AlertTriangle, label: '异常' },
};

function getQcStatusLabel(status: ClothingQcStatus): string {
  const map: Record<ClothingQcStatus, string> = {
    [ClothingQcStatus.NOT_INSPECTED]: '待质检',
    [ClothingQcStatus.PASSED]: '质检通过',
    [ClothingQcStatus.FAILED]: '质检未通过',
    [ClothingQcStatus.EXCEPTION]: '质检异常',
  };
  return map[status] || status;
}

export interface QcClothingCardProps {
  clothing: ClothingItem;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const QcClothingCard: React.FC<QcClothingCardProps> = ({
  clothing,
  selected,
  onClick,
  className,
}) => {
  const riskBar = COLOR_RISK_BAR[clothing.colorRisk] || COLOR_RISK_BAR['无'];
  const cornerStyle = QC_CORNER_STYLE[clothing.qcStatus];
  const CornerIcon = cornerStyle.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white border rounded-md overflow-hidden cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        selected
          ? 'border-primary-500 ring-2 ring-primary-500/30 shadow-md'
          : 'border-slate-200 hover:border-primary-300',
        className
      )}
    >
      <div
        className={cn(
          'absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 text-white text-[10px] font-semibold rounded-bl-md',
          cornerStyle.bg
        )}
      >
        <CornerIcon className="w-3 h-3" />
        {cornerStyle.label}
      </div>

      <div className={cn('h-1 w-full', riskBar)} />

      <div className="relative h-36 bg-slate-100 flex items-center justify-center">
        <ImageIcon className="w-10 h-10 text-slate-300" />
        {clothing.isValuable && (
          <div className="absolute top-2 left-2">
            <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
              <Diamond className="w-3 h-3" />
              贵重
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {clothing.clothingType}
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
              <Tag className="w-3 h-3" />
              {clothing.barcode}
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
            ¥{clothing.basePrice}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="slate" className="text-[10px] px-1.5 py-0.5">
            {clothing.color}
          </Badge>
          <StatusTag status={getQcStatusLabel(clothing.qcStatus)} type="qc" />
        </div>

        {clothing.valuation > 0 && (
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            估值：<span className="tabular-nums font-medium text-slate-700">¥{clothing.valuation}</span>
          </div>
        )}
      </div>
    </div>
  );
};
