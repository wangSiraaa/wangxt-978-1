import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/Table';
import { StatusTag } from '../ui/StatusTag';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import type { Batch } from '../../types';
import { BatchStatus } from '../../types';

function formatDate(date: Date | string): string {
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

export interface BatchTableProps {
  batches: Batch[];
  selectedBatchId?: string | null;
  onSelect: (batch: Batch | null) => void;
  className?: string;
}

export const BatchTable: React.FC<BatchTableProps> = ({
  batches,
  selectedBatchId,
  onSelect,
  className,
}) => {
  const getClothingByBatchId = useAppStore((s) => s.getClothingByBatchId);

  const sortedBatches = React.useMemo(() => {
    return [...batches].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [batches]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-end">
        <Badge variant="slate" className="h-8 px-3 flex items-center">
          共 {sortedBatches.length} 条
        </Badge>
      </div>

      {sortedBatches.length === 0 ? (
        <EmptyState
          title="暂无批次数据"
          description="点击新建批次开始录入"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>批次号</TableHead>
              <TableHead>顾客</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>衣物数量</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>预计完成时间</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBatches.map((batch) => {
              const clothCount = getClothingByBatchId(batch.id).length;
              const isSelected = selectedBatchId === batch.id;
              return (
                <TableRow
                  key={batch.id}
                  onClick={() => onSelect(isSelected ? null : batch)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected && 'bg-primary-50/60'
                  )}
                >
                  <TableCell className="font-mono text-xs font-medium text-primary-700">
                    {batch.batchNo}
                  </TableCell>
                  <TableCell className="font-medium">{batch.customerName}</TableCell>
                  <TableCell className="text-slate-500">{batch.customerPhone}</TableCell>
                  <TableCell>
                    <Badge variant="primary" className="text-xs">
                      {clothCount} 件
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusTag status={getBatchStatusLabel(batch.status)} type="batch" />
                  </TableCell>
                  <TableCell className="text-slate-500 tabular-nums text-sm">
                    {formatDate(batch.expectedTime)}
                  </TableCell>
                  <TableCell className="text-slate-400 tabular-nums text-xs">
                    {formatDate(batch.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
