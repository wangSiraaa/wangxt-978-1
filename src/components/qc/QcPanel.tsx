import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Diamond,
  AlertCircle,
  Lightbulb,
  Palette,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { ClothingItem } from '../../types';
import { QcResult } from '../../types';
import { Alert } from '../ui/Alert';

const COLOR_RISK_OPTIONS = ['无', '低', '中', '高', '易染色', '易褪色'];
const SUGGESTION_OPTIONS = [
  '正常交付',
  '返洗处理',
  '联系顾客确认',
  '赔付审批',
  '转外包处理',
];

export interface QcPanelProps {
  visible: boolean;
  clothing: ClothingItem | null;
  onClose: () => void;
  onSubmit: (result: string, description?: string) => void;
  className?: string;
}

export const QcPanel: React.FC<QcPanelProps> = ({ visible, clothing, onClose, onSubmit, className }) => {
  const submitQc = useAppStore((s) => s.submitQc);
  const { currentUser } = useAuthStore();

  const [result, setResult] = React.useState<QcResult | null>(null);
  const [description, setDescription] = React.useState('');
  const [colorRisk, setColorRisk] = React.useState('无');
  const [valuation, setValuation] = React.useState('');
  const [suggestion, setSuggestion] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [photos, setPhotos] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (clothing) {
      setResult(null);
      setDescription('');
      setColorRisk(clothing.colorRisk || '无');
      setValuation(String(clothing.valuation || 0));
      setSuggestion('');
      setError(null);
      setSubmitting(false);
      setPhotos([]);
    }
  }, [clothing]);

  const addPhotoPlaceholder = () => {
    setPhotos((prev) => [...prev, `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`]);
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = result !== null;

  const handleSubmit = (submitResult: QcResult) => {
    if (!clothing) return;
    setSubmitting(true);
    setError(null);
    try {
      submitQc({
        batchId: clothing.batchId,
        clothingId: clothing.id,
        result: submitResult,
        description: description.trim() || undefined,
        photos,
        suggestion: suggestion || undefined,
        inspector: currentUser?.id || 'system',
      });
      onSubmit(submitResult, description.trim() || undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !clothing) {
    return (
      <div className={cn('h-full flex items-center justify-center p-6', className)}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700">请选择衣物</h3>
          <p className="text-xs text-slate-400 mt-1">从左侧列表选择要质检的衣物</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-900">{clothing.clothingType}</div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">{clothing.barcode}</div>
          </div>
          {clothing.isValuable && (
            <Badge variant="warning" className="flex items-center gap-1">
              <Diamond className="w-3 h-3" /> 贵重
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <Badge variant="slate">{clothing.color}</Badge>
          <span>基础价：<span className="tabular-nums font-medium text-slate-700">¥{clothing.basePrice}</span></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {error && <Alert variant="danger" title="提交失败" message={error} />}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-slate-400" />
            质检照片
          </label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className="relative aspect-square bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center group"
              >
                <Camera className="w-6 h-6 text-slate-300" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-0.5 bg-danger-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPhotoPlaceholder}
              className="aspect-square border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[10px]">添加</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">异常描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              result === QcResult.PASS
                ? '（选填）质检备注说明'
                : '请详细描述质检发现的问题、污渍位置、破损情况等...'
            }
            rows={4}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-md resize-none transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400',
              'border-slate-300 hover:border-slate-400'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-slate-400" /> 颜色风险
            </label>
            <select
              value={colorRisk}
              onChange={(e) => setColorRisk(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            >
              {COLOR_RISK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <Input
            label="贵重估值（元）"
            icon={Diamond}
            type="number"
            min="0"
            value={valuation}
            onChange={(e) => setValuation(e.target.value)}
            className="h-10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-slate-400" /> 处理建议
          </label>
          <select
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="">（不指定）</option>
            {SUGGESTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="success"
            size="lg"
            loading={submitting && result === QcResult.PASS}
            disabled={!canSubmit}
            onClick={() => handleSubmit(QcResult.PASS)}
            className="flex-col h-auto py-3"
          >
            <CheckCircle2 className="w-5 h-5 mb-0.5" />
            <span className="text-xs">通过</span>
          </Button>
          <Button
            variant="danger"
            size="lg"
            loading={submitting && result === QcResult.FAIL}
            disabled={!canSubmit}
            onClick={() => handleSubmit(QcResult.FAIL)}
            className="flex-col h-auto py-3"
          >
            <XCircle className="w-5 h-5 mb-0.5" />
            <span className="text-xs">失败</span>
          </Button>
          <Button
            variant="accent"
            size="lg"
            loading={submitting && result === QcResult.EXCEPTION}
            disabled={!canSubmit}
            onClick={() => handleSubmit(QcResult.EXCEPTION)}
            className="flex-col h-auto py-3"
          >
            <AlertTriangle className="w-5 h-5 mb-0.5" />
            <span className="text-xs">异常</span>
          </Button>
        </div>
        {!canSubmit && (
          <p className="text-[11px] text-center text-slate-400">点击上方按钮选择质检结果</p>
        )}
      </div>
    </div>
  );
};
