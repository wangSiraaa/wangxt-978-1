import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MinusCircle, User, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Alert } from '../ui/Alert';

const REASON_MAX_LENGTH = 200;

export interface ReductionModalProps {
  open: boolean;
  onClose: () => void;
  maxReduction?: number;
  currentAmount?: number;
  onApply?: (amount: number, reason: string) => void;
  onConfirm?: (amount: number, reason: string) => void;
  className?: string;
}

export const ReductionModal: React.FC<ReductionModalProps> = ({
  open,
  onClose,
  maxReduction,
  currentAmount,
  onApply,
  onConfirm,
  className,
}) => {
  const actualMaxReduction = maxReduction ?? currentAmount ?? 0;
  const { currentUser } = useAuthStore();

  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [errors, setErrors] = React.useState<{ amount?: string; reason?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const appliedAt = React.useMemo(() => new Date(), [open]);

  React.useEffect(() => {
    if (open) {
      setAmount('');
      setReason('');
      setErrors({});
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const validateAmount = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return '请输入减免金额';
    const num = Number(trimmed);
    if (Number.isNaN(num) || num <= 0) return '减免金额必须大于0';
    if (num > actualMaxReduction) return `减免金额不能超过应付金额 ¥${actualMaxReduction.toFixed(2)}`;
    return undefined;
  };

  const validateReason = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return '请填写减免原因';
    if (trimmed.length < 5) return '减免原因至少5个字符';
    if (trimmed.length > REASON_MAX_LENGTH) return `减免原因不能超过${REASON_MAX_LENGTH}字`;
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
      const rsn = reason.trim();
      onApply?.(amt, rsn);
      onConfirm?.(amt, rsn);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const amountNum = Number(amount.trim()) || 0;
  const canApply = !errors.amount && !errors.reason && amountNum > 0 && amountNum <= actualMaxReduction && reason.trim().length >= 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <MinusCircle className="w-5 h-5 text-danger-500" />
          费用减免
        </div>
      }
      size="md"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="danger" onClick={handleSubmit} disabled={!canApply} loading={submitting}>
            确认减免
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger" title="减免失败" message={error} />}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          可减免上限：
          <span className="font-semibold text-slate-700 tabular-nums">¥{actualMaxReduction.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            减免人：
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

        <Input
          label="减免金额（元）"
          icon={MinusCircle}
          type="number"
          min="0"
          step="0.01"
          placeholder={`请输入减免金额，不超过 ¥${actualMaxReduction.toFixed(2)}`}
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
            减免原因
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
            placeholder="请详细填写减免原因（不少于5字），如：污渍未洗净补偿、熟客优惠、会员补偿等"
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
