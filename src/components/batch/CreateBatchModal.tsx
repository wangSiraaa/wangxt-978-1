import * as React from 'react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Plus, Trash2, Scan, User, Phone, CreditCard, Calendar, Tag, Shirt, Palette, AlertTriangle, Diamond } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Alert } from '../ui/Alert';

interface ClothingFormItem {
  id: string;
  barcode: string;
  clothingType: string;
  color: string;
  colorRisk: string;
  valuation: string;
  isValuable: boolean;
  washProject: string;
  basePrice: string;
}

const COLOR_RISK_OPTIONS = ['无', '低', '中', '高', '易染色', '易褪色'];
const WASH_PROJECT_OPTIONS = [
  { value: 'water_wash', label: '水洗' },
  { value: 'dry_clean', label: '干洗' },
  { value: 'iron', label: '熨烫' },
  { value: 'leather', label: '皮具护理' },
  { value: 'special', label: '特殊处理' },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyClothing(): ClothingFormItem {
  return {
    id: uid(),
    barcode: '',
    clothingType: '',
    color: '',
    colorRisk: '无',
    valuation: '0',
    isValuable: false,
    washProject: 'water_wash',
    basePrice: '0',
  };
}

export interface CreateBatchModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (batchId: string) => void;
  className?: string;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  open,
  onClose,
  onCreated,
  className,
}) => {
  const createBatch = useAppStore((s) => s.createBatch);
  const stores = useAppStore((s) => s.stores);
  const { currentUser } = useAuthStore();

  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [memberNo, setMemberNo] = React.useState('');
  const [expectedDays, setExpectedDays] = React.useState('2');
  const [clothes, setClothes] = React.useState<ClothingFormItem[]>([createEmptyClothing()]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCustomerName('');
      setCustomerPhone('');
      setMemberNo('');
      setExpectedDays('2');
      setClothes([createEmptyClothing()]);
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const addClothing = () => {
    setClothes((prev) => [...prev, createEmptyClothing()]);
  };

  const removeClothing = (id: string) => {
    setClothes((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const updateClothing = (id: string, field: keyof ClothingFormItem, value: any) => {
    setClothes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    if (errors[`cloth_${id}_${field}`]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[`cloth_${id}_${field}`];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!customerName.trim()) nextErrors.customerName = '请输入顾客姓名';
    if (!/^1\d{10}$/.test(customerPhone)) nextErrors.customerPhone = '请输入正确的11位手机号';

    clothes.forEach((c, idx) => {
      if (!c.clothingType.trim()) nextErrors[`cloth_${c.id}_clothingType`] = '请输入衣物类型';
      if (!c.color.trim()) nextErrors[`cloth_${c.id}_color`] = '请输入颜色';
      const price = parseFloat(c.basePrice);
      if (isNaN(price) || price < 0) nextErrors[`cloth_${c.id}_basePrice`] = '请输入正确的价格';
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + parseInt(expectedDays || '2', 10));

      const currentStore = stores[0] || { id: 'store_001' };

      const batch = createBatch(
        {
          customerId: 'cust_' + uid(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          storeId: currentStore.id,
          createdBy: currentUser?.id || 'system',
          expectedTime: expectedDate,
        },
        clothes.map((c) => ({
          clothingType: c.clothingType.trim(),
          color: c.color.trim(),
          colorRisk: c.colorRisk,
          valuation: parseFloat(c.valuation) || 0,
          isValuable: c.isValuable,
          washProject: c.washProject,
          basePrice: parseFloat(c.basePrice) || 0,
        }))
      );

      onCreated?.(batch.id);
      onClose();
    } catch (e) {
      setErrors({ submit: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = clothes.reduce((sum, c) => sum + (parseFloat(c.basePrice) || 0), 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="创建批次"
      size="xl"
      className={className}
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-slate-500">预估总价：</span>
            <span className="text-lg font-bold text-primary-600 tabular-nums ml-1">¥ {totalPrice.toFixed(2)}</span>
          </div>
          <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            创建批次
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {errors.submit && (
          <Alert variant="danger" title="创建失败" message={errors.submit} />
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-500" />
            顾客信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="顾客姓名"
              icon={User}
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errors.customerName) setErrors((e) => ({ ...e, customerName: '' }));
              }}
              error={errors.customerName}
              placeholder="请输入姓名"
            />
            <Input
              label="手机号"
              icon={Phone}
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (errors.customerPhone) setErrors((e) => ({ ...e, customerPhone: '' }));
              }}
              error={errors.customerPhone}
              placeholder="请输入11位手机号"
              maxLength={11}
            />
            <Input
              label="会员号（选填）"
              icon={CreditCard}
              value={memberNo}
              onChange={(e) => setMemberNo(e.target.value)}
              placeholder="会员卡号"
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            取件时间
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">预计完成（天）</label>
              <select
                value={expectedDays}
                onChange={(e) => setExpectedDays(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              >
                <option value="1">1天（加急）</option>
                <option value="2">2天（普通）</option>
                <option value="3">3天</option>
                <option value="5">5天</option>
                <option value="7">7天</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary-500" />
              衣物清单
              <Badge variant="primary">{clothes.length} 件</Badge>
            </h3>
            <Button variant="outline" size="sm" onClick={addClothing}>
              <Plus className="w-4 h-4 mr-1" /> 添加衣物
            </Button>
          </div>

          <div className="space-y-3">
            {clothes.map((cloth, idx) => (
              <div
                key={cloth.id}
                className="p-4 border border-slate-200 rounded-md bg-slate-50/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">衣物 {idx + 1}</span>
                    {cloth.barcode && (
                      <Badge variant="slate" className="font-mono text-[10px]">{cloth.barcode}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="扫码占位"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                    {clothes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClothing(cloth.id)}
                        className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input
                    label="类型"
                    icon={Shirt}
                    value={cloth.clothingType}
                    onChange={(e) => updateClothing(cloth.id, 'clothingType', e.target.value)}
                    error={errors[`cloth_${cloth.id}_clothingType`]}
                    placeholder="如：西装外套"
                    className="h-9"
                  />
                  <Input
                    label="颜色"
                    icon={Palette}
                    value={cloth.color}
                    onChange={(e) => updateClothing(cloth.id, 'color', e.target.value)}
                    error={errors[`cloth_${cloth.id}_color`]}
                    placeholder="如：藏青色"
                    className="h-9"
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" /> 颜色风险
                    </label>
                    <select
                      value={cloth.colorRisk}
                      onChange={(e) => updateClothing(cloth.id, 'colorRisk', e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                    >
                      {COLOR_RISK_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">清洗项目</label>
                    <select
                      value={cloth.washProject}
                      onChange={(e) => updateClothing(cloth.id, 'washProject', e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                    >
                      {WASH_PROJECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="基础价格（元）"
                    icon={Tag}
                    type="number"
                    min="0"
                    step="0.5"
                    value={cloth.basePrice}
                    onChange={(e) => updateClothing(cloth.id, 'basePrice', e.target.value)}
                    error={errors[`cloth_${cloth.id}_basePrice`]}
                    className="h-9"
                  />
                  <Input
                    label="估值（元）"
                    icon={Diamond}
                    type="number"
                    min="0"
                    value={cloth.valuation}
                    onChange={(e) => updateClothing(cloth.id, 'valuation', e.target.value)}
                    className="h-9"
                  />
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cloth.isValuable}
                        onChange={(e) => updateClothing(cloth.id, 'isValuable', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-400"
                      />
                      <Diamond className="w-3.5 h-3.5 text-amber-500" />
                      <span>贵重物品</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
