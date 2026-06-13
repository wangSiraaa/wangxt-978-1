import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import {
  AlertCircle,
  FileText,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { CompensationStatus } from '../../types';
import { Alert } from '../ui/Alert';

export type CompensationMode = 'apply' | 'approve';

export interface CompensationModalProps {
  open: boolean;
  onClose: () => void;
  mode: CompensationMode;
  clothingPreview?: { barcode: string; clothingType: string; color: string; valuation?: number }[];
  initial?: {
    applyAmount?: number;
    approveAmount?: number;
    applyReason?: string;
    approveComment?: string;
    status?: CompensationStatus;
  };
  onSubmit?: (data: {
    applyAmount: number;
    approveAmount?: number;
    applyReason: string;
    approveComment?: string;
  }) => Promise<void> | void;
  className?: string;
}

export const CompensationModal: React.FC<CompensationModalProps> = ({
  open,
  onClose,
  mode,
  clothingPreview,
  initial,
  onSubmit,
  className,
}) => {
  const { currentUser } = useAuthStore();

  const [applyAmount, setApplyAmount] = React.useState('');
  const [approveAmount, setApproveAmount] = React.useState('');
  const [applyReason, setApplyReason] = React.useState('');
  const [approveComment, setApproveComment] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isApprover = mode === 'approve';

  React.useEffect(() => {
    if (open) {
      setApplyAmount(initial?.applyAmount ? String(initial.applyAmount) : '');
      setApproveAmount(initial?.approveAmount ? String(initial.approveAmount) : '');
      setApplyReason(initial?.applyReason || '');
      setApproveComment(initial?.approveComment || '');
      setErrors({});
      setSubmitting(false);
      setError(null);
    }
  }, [open, initial]);

  const validate = () => {
    const next: Record<string, string> = {};
    const aa = Number(applyAmount.trim());
    if (!applyAmount.trim() || Number.isNaN(aa) || aa <= 0) {
      next.applyAmount = '请输入有效的申请金额';
    }
    if (!applyReason.trim()) {
      next.applyReason = '请填写赔付原因';
    } else if (applyReason.trim().length < 5) {
      next.applyReason = '赔付原因至少5个字符';
    }
    if (isApprover) {
      const ap = Number(approveAmount.trim());
      if (!approveAmount.trim() || Number.isNaN(ap) || ap < 0) {
        next.approveAmount = '请输入有效的审批金额';
      }
      if (ap > aa) {
        next.approveAmount = '审批金额不能超过申请金额';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (action: 'approve' | 'reject') => {
    if (isApprover && action === 'approve' && !validate()) return;
    if (!isApprover && !validate()) return;

    setSubmitting(true);
    setError(null);
    try {
      const aa = Number(applyAmount.trim());
      const data: any = {
        applyAmount: aa,
        applyReason: applyReason.trim(),
      };
      if (isApprover) {
        if (action === 'approve') {
          data.approveAmount = Number(approveAmount.trim());
          data.approveComment = approveComment.trim() || undefined;
        } else {
          data.approveAmount = 0;
          data.approveComment = approveComment.trim() || '已驳回';
        }
      }
      await onSubmit?.(data);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = isApprover ? '赔付审批' : '赔付申请';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className={cn('w-5 h-5', isApprover ? 'text-warning-500' : 'text-danger-500')} />
          {title}
        </div>
      }
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          {isApprover ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit('reject')}
                loading={submitting}
                className="text-danger-600 border-danger-300 hover:bg-danger-50 hover:border-danger-400"
              >
                <XCircle className="w-4 h-4 mr-1" />
                驳回
              </Button>
              <Button
                variant="success"
                onClick={() => handleSubmit('approve')}
                loading={submitting}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                通过
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => handleSubmit('approve')} loading={submitting}>
              <FileText className="w-4 h-4 mr-1" />
              提交申请
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert variant="danger" title="操作失败" message={error} />}

        {clothingPreview && clothingPreview.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs font-semibold text-slate-600 mb-2">涉及衣物（{clothingPreview.length} 件）</div>
            <div className="flex flex-wrap gap-1.5">
              {clothingPreview.map((c, i) => (
                <Badge key={i} variant="slate" className="text-[11px]">
                  <span className="font-mono mr-1">{c.barcode}</span>
                  {c.clothingType} · {c.color}
                  {c.valuation ? ` · 估值¥${c.valuation}` : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {isApprover ? '审批人' : '申请人'}：
            <span className="font-medium text-slate-700">{currentUser?.name || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            时间：
            <span className="font-medium text-slate-700 tabular-nums">
              {new Date().toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <Input
          label={
            <span className="flex items-center gap-1">
              申请金额（元）
              <span className="text-danger-500">*</span>
            </span>
          }
          icon={DollarSign}
          type="number"
          min="0"
          step="0.01"
          placeholder="请输入申请赔付金额"
          value={applyAmount}
          onChange={(e) => {
            setApplyAmount(e.target.value);
            if (errors.applyAmount) setErrors((p) => ({ ...p, applyAmount: undefined }));
          }}
          error={errors.applyAmount}
          disabled={isApprover}
          className="h-11"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            赔付原因
            <span className="text-danger-500 ml-0.5">*</span>
          </label>
          <textarea
            value={applyReason}
            onChange={(e) => {
              setApplyReason(e.target.value.slice(0, 300));
              if (errors.applyReason) setErrors((p) => ({ ...p, applyReason: undefined }));
            }}
            placeholder={isApprover ? '赔付申请原因描述' : '请详细说明赔付原因（如：衣物损坏、颜色串色、丢失等）'}
            rows={4}
            disabled={isApprover}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-md resize-none transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400',
              errors.applyReason
                ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-200'
                : 'border-slate-300 hover:border-slate-400',
              isApprover && 'bg-slate-50 text-slate-600 cursor-not-allowed'
            )}
          />
          <div className="flex justify-between mt-1">
            {errors.applyReason ? (
              <p className="text-xs text-danger-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.applyReason}
              </p>
            ) : (
              <span />
            )}
            <span className="text-[11px] text-slate-400 tabular-nums">{applyReason.length}/300</span>
          </div>
        </div>

        {isApprover && (
          <>
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-warning-500" />
                审批信息
              </div>

              <Input
                label={
                  <span className="flex items-center gap-1">
                    审批金额（元）
                    <span className="text-danger-500">*</span>
                  </span>
                }
                icon={DollarSign}
                type="number"
                min="0"
                step="0.01"
                placeholder={`请输入审批金额（不超过申请金额 ¥${Number(applyAmount || 0).toFixed(2)}）`}
                value={approveAmount}
                onChange={(e) => {
                  setApproveAmount(e.target.value);
                  if (errors.approveAmount) setErrors((p) => ({ ...p, approveAmount: undefined }));
                }}
                error={errors.approveAmount}
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                审批意见
                <span className="text-slate-400 ml-1 text-xs">（驳回时必填）</span>
              </label>
              <textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value.slice(0, 300))}
                placeholder="请输入审批意见或驳回理由..."
                rows={3}
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-md resize-none transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400',
                  'border-slate-300 hover:border-slate-400'
                )}
              />
              <div className="flex justify-end mt-1">
                <span className="text-[11px] text-slate-400 tabular-nums">{approveComment.length}/300</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
