import * as React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusTag } from '../ui/StatusTag';
import { Input } from '../ui/Input';
import {
  Shield,
  Lock,
  Unlock,
  Search,
  Clock,
  User,
  FileText,
} from 'lucide-react';
import type { LockRecord } from '../../types';
import { LockType } from '../../types';
import { EmptyState } from '../ui/EmptyState';

export interface LockAuditTableProps {
  records: LockRecord[];
  batchNoMap?: Record<string, string>;
  onUnlock?: (record: LockRecord) => Promise<void> | void;
  className?: string;
}

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getLockTypeLabel(t: LockType): string {
  const map: Record<LockType, string> = {
    [LockType.PICKUP_CODE]: '取件码错误锁定',
    [LockType.SYSTEM]: '系统自动锁定',
    [LockType.MANUAL]: '人工锁定',
    [LockType.EXCEPTION]: '异常锁定',
    [LockType.OTHER]: '其他锁定',
  };
  return map[t] || t;
}

function getLockBadgeVariant(t: LockType): 'danger' | 'warning' | 'accent' | 'slate' {
  switch (t) {
    case LockType.PICKUP_CODE:
    case LockType.EXCEPTION:
      return 'danger';
    case LockType.MANUAL:
      return 'warning';
    case LockType.SYSTEM:
      return 'accent';
    default:
      return 'slate';
  }
}

export const LockAuditTable: React.FC<LockAuditTableProps> = ({
  records,
  batchNoMap = {},
  onUnlock,
  className,
}) => {
  const [keyword, setKeyword] = React.useState('');
  const [filterType, setFilterType] = React.useState<LockType | 'ALL'>('ALL');
  const [filterUnlocked, setFilterUnlocked] = React.useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL');
  const [unlockingId, setUnlockingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    return records.filter((r) => {
      if (filterType !== 'ALL' && r.lockType !== filterType) return false;
      if (filterUnlocked === 'LOCKED' && r.isUnlocked) return false;
      if (filterUnlocked === 'UNLOCKED' && !r.isUnlocked) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const text = [
          batchNoMap[r.batchId],
          r.reason,
          r.lockedBy,
          r.unlockedBy,
          r.remark,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(k)) return false;
      }
      return true;
    });
  }, [records, keyword, filterType, filterUnlocked, batchNoMap]);

  const handleUnlock = async (r: LockRecord) => {
    if (r.isUnlocked || !onUnlock) return;
    setUnlockingId(r.id);
    try {
      await onUnlock(r);
    } finally {
      setUnlockingId(null);
    }
  };

  const stats = React.useMemo(() => {
    const total = records.length;
    const locked = records.filter((r) => !r.isUnlocked).length;
    const unlocked = total - locked;
    return { total, locked, unlocked };
  }, [records]);

  const lockTypes = React.useMemo(() => {
    const set = new Set(records.map((r) => r.lockType));
    return Array.from(set);
  }, [records]);

  return (
    <Card className={className}>
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-warning-500" />
            锁定/解锁审计
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="slate">总计 {stats.total}</Badge>
            <Badge variant="danger">
              <Lock className="w-3 h-3 mr-1" />
              {stats.locked}
            </Badge>
            <Badge variant="success">
              <Unlock className="w-3 h-3 mr-1" />
              {stats.unlocked}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            icon={Search}
            placeholder="搜索批次号、原因、操作人..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9 w-72"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LockType | 'ALL')}
            className="h-9 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="ALL">全部类型</option>
            {lockTypes.map((t) => (
              <option key={t} value={t}>{getLockTypeLabel(t as LockType)}</option>
            ))}
          </select>
          <select
            value={filterUnlocked}
            onChange={(e) => setFilterUnlocked(e.target.value as any)}
            className="h-9 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="ALL">全部状态</option>
            <option value="LOCKED">仅锁定中</option>
            <option value="UNLOCKED">已解锁</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Shield}
              title="暂无锁定记录"
              description="当前筛选条件下没有锁定记录"
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {filtered.map((r) => (
              <div key={r.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {batchNoMap[r.batchId] || r.batchId}
                      </span>
                      <Badge variant={getLockBadgeVariant(r.lockType as LockType)}>
                        {getLockTypeLabel(r.lockType as LockType)}
                      </Badge>
                      {r.isUnlocked ? (
                        <Badge variant="success">
                          <Unlock className="w-3 h-3 mr-1" />
                          已解锁
                        </Badge>
                      ) : (
                        <Badge variant="danger">
                          <Lock className="w-3 h-3 mr-1" />
                          锁定中
                        </Badge>
                      )}
                    </div>

                    {r.reason && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="break-all">{r.reason}</span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 tabular-nums">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        {formatDateTime(r.lockedAt)}
                      </span>
                      {r.lockedBy && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          锁定：{r.lockedBy}
                        </span>
                      )}
                      {r.isUnlocked && (
                        <>
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-success-500" />
                            {r.unlockedAt ? formatDateTime(r.unlockedAt) : '-'}
                          </span>
                          {r.unlockedBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              解锁：{r.unlockedBy}
                            </span>
                          )}
                        </>
                      )}
                      {r.autoUnlockAt && !r.isUnlocked && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          预计自动解锁：{formatDateTime(r.autoUnlockAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {!r.isUnlocked && onUnlock && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlock(r)}
                        loading={unlockingId === r.id}
                        className="text-success-700 border-success-300 hover:bg-success-50 hover:border-success-400"
                      >
                        <Unlock className="w-3.5 h-3.5 mr-1" />
                        解锁
                      </Button>
                    )}
                  </div>
                </div>
                {r.isUnlocked && r.remark && (
                  <div className="mt-2 pl-0.5 text-[11px] text-success-700 bg-success-50/60 px-2.5 py-1.5 rounded border border-success-100">
                    <span className="font-medium">解锁备注：</span>
                    {r.remark}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
