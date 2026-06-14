import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RefreshCw, User, Clock, AlertCircle, CheckCircle, Plus, Minus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Alert } from '../ui/Alert';

const REASON_MAX_LENGTH = 200;

export interface CorrectionModalProps {
  open: boolean;
  onClose: () => void;
  currentAmount?: number;
  isDayClosed?: boolean;
  onConfirm?: (amount: number, reason: string) => void;
  className?: string;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  open,
  onClose,
  currentAmount,
  isDayClosed = false,
  onConfirm,
  className,
}) => {
  const { currentUser } = useAuthStore();

  const [direction, setDirection] = React.useState<'increase' | 'decrease'>('decrease');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [errors, setErrors] = React.useState<{ amount?: string; reason?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const appliedAt = React.useMemo(() => new Date(), [open]);

  React.useEffect(() => {
    if (open) {
      setDirection('decrease');
      setAmount('');
      setReason('');
      setErrors({});
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const validateAmount = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return '请输入冲正金额';
    const num = Number(trimmed);
    if (Number.isNaN(num) || num <= 0) return '冲正金额必须大于0';
    if (!isDayClosed && direction === 'decrease' && num > (currentAmount || 0)) {
      return `冲减金额不能超过应付金额 ¥${currentAmount?.toFixed(2)}`;
    }
    return undefined;
  };

  const validateReason = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return '请填写冲正原因';
    if (trimmed.length < 5) return '冲正原因至少5个字符';
    if (trimmed.length > REASON_MAX_LENGTH) return `冲正原因不能超过${REASON_MAX_LENGTH}字`;
    return undefined;
  };

  const handleSubmit = async () => {
    const amountErr = validateAmount(amount);
    const reasonErr = validateReason(reason);
    if (amountErr || reasonErr) {
      setErrors({ amount: amountErr, reason: reasonErr });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setError(null);
    try {
      const amt = Number(amount.trim());
      const actualAmount = direction === 'decrease' ? -amt : amt;
      const rsn = reason.trim();
      onConfirm?.(actualAmount, rsn);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const amountNum = Number(amount.trim()) || 0;
  const canApply = !errors.amount && !errors.reason && amountNum > 0 && reason.trim().length >= 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-amber-500" />
          费用冲正
          {isDayClosed && (
            <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              日结后调整
            </span>
          )}
        </div>
      }
      size="md"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="warning" onClick={handleSubmit} disabled={!canApply} loading={submitting}>
            确认冲正
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger" title="冲正失败" message={error} />}

        {isDayClosed && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">该批次已日结锁定</div>
              <div className="mt-0.5 text-amber-600">冲正将自动转为日结调整记录，不影响原日结数据</div>
            </div>
          </div>
        )}

        {currentAmount !== undefined && !isDayClosed && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            当前应付金额：
            <span className="font-semibold text-slate-700 tabular-nums">¥{currentAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            冲正人：
            <span className="font-medium text-slate-700">
              {currentUser?.name || '当前用户'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            时间：
            <span className="font-medium text-slate-700 tabular-nums">
              {appliedAt.toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            冲正方向
            <span className="text-danger-500 ml-0.5">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection('decrease')}
              className={cn(
                'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-1',
                direction === 'decrease'
                  ? 'bg-success-50 border-success-300 text-success-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <Minus className="w-4 h-4" />
              冲减（减少应收）
            </button>
            <button
              type="button"
              onClick={() => setDirection('increase')}
              className={cn(
                'flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-1',
                direction === 'increase'
                  ? 'bg-danger-50 border-danger-300 text-danger-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              <Plus className="w-4 h-4" />
              冲加（增加应收）
            </button>
          </div>
        </div>

        <Input
          label="冲正金额（元）"
          icon={RefreshCw}
          type="number"
          min="0"
          step="0.01"
          placeholder="请输入冲正金额"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
          }}
          onBlur={() => {
            const err = validateAmount(amount);
            if (err) setErrors((prev) => ({ ...prev, amount: err }));
          }}
          error={errors.amount}
          className="h-11"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            冲正原因
            <span className="text-danger-500 ml-0.5">*</span>
            <span className="text-xs text-slate-400 ml-2">
              （必填，{reason.length}/{REASON_MAX_LENGTH}）
            </span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value.slice(0, REASON_MAX_LENGTH));
              if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }));
            }}
            onBlur={() => {
              const err = validateReason(reason);
              if (err) setErrors((prev) => ({ ...prev, reason: err }));
            }}
            placeholder="请详细填写冲正原因（不少于5字），如：收款金额录入错误、费用计算错误、系统异常调整等"
            rows={4}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-md resize-none transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400',
              errors.reason
                ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                : 'border-slate-300 hover:border-slate-400'
            )}
          />
          {errors.reason ? (
            <p className="mt-1.5 text-xs text-danger-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.reason}
            </p>
          ) : (
            reason.trim().length >= 5 && (
              <p className="mt-1.5 text-xs text-success-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                原因描述符合要求
              </p>
            )
          )}
        </div>
      </div>
    </Modal>
  );
};
