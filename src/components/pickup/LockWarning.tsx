import * as React from 'react';
import { cn } from '../../lib/utils';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Lock, Unlock, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import type { LockRecord } from '../../types';

export interface LockWarningProps {
  failedAttempts: number;
  maxAttempts: number;
  lockRecord: LockRecord | null;
  onRequestUnlock?: () => void;
  className?: string;
}

export const LockWarning: React.FC<LockWarningProps> = ({
  failedAttempts,
  maxAttempts,
  lockRecord,
  onRequestUnlock,
  className,
}) => {
  const remaining = Math.max(0, maxAttempts - failedAttempts);
  const isLocked = !!lockRecord;
  const warningLevel = React.useMemo(() => {
    if (isLocked) return 'locked';
    if (remaining <= 1) return 'critical';
    if (remaining <= 2) return 'warning';
    if (failedAttempts > 0) return 'info';
    return null;
  }, [isLocked, remaining, failedAttempts]);

  if (!warningLevel) return null;

  const progress = Math.min(100, (failedAttempts / maxAttempts) * 100);

  if (isLocked) {
    return (
      <div className={cn('w-full max-w-xl mx-auto', className)}>
        <Alert
          variant="danger"
          icon={ShieldAlert}
          title={
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              账号已锁定
            </div>
          }
        >
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-slate-500 shrink-0 w-16">锁定类型：</span>
              <Badge variant="danger">
                {lockRecord.lockType || '取件验证锁定'}
              </Badge>
            </div>
            {lockRecord.reason && (
              <div className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0 w-16">锁定原因：</span>
                <span className="text-slate-700">{lockRecord.reason}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <span className="text-slate-600">
                锁定时间：
                <span className="tabular-nums ml-1">
                  {new Date(lockRecord.lockedAt).toLocaleString('zh-CN')}
                </span>
              </span>
            </div>
            {lockRecord.autoUnlockAt && (
              <div className="flex items-start gap-2">
                <Unlock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-slate-600">
                  预计自动解锁时间：
                  <span className="tabular-nums ml-1 font-medium">
                    {new Date(lockRecord.autoUnlockAt).toLocaleString('zh-CN')}
                  </span>
                </span>
              </div>
            )}
          </div>
          {onRequestUnlock && (
            <div className="mt-4 pt-3 border-t border-danger-200/50">
              <Button variant="danger" size="md" onClick={onRequestUnlock} className="w-full">
                <Unlock className="w-4 h-4 mr-1.5" />
                申请人工解锁
              </Button>
            </div>
          )}
        </Alert>
      </div>
    );
  }

  const variant = warningLevel === 'critical' ? 'danger' : warningLevel === 'warning' ? 'warning' : 'info';

  return (
    <div className={cn('w-full max-w-xl mx-auto', className)}>
      <Alert
        variant={variant}
        icon={AlertTriangle}
        title={
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span>验证错误警告</span>
            <Badge variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}>
              剩余 {remaining} 次
            </Badge>
          </div>
        }
      >
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">
            您已累计输入错误 <span className="font-semibold text-inherit">{failedAttempts}</span> 次，
            连续错误超过 <span className="font-semibold text-inherit">{maxAttempts}</span> 次将被临时锁定。
          </p>
          <div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  warningLevel === 'critical'
                    ? 'bg-danger-500'
                    : warningLevel === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-primary-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 tabular-nums">
              <span>0</span>
              <span>{maxAttempts}</span>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
};
