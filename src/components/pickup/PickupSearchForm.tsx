import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tabs, TabList, Tab, TabPanel } from '../ui/Tabs';
import { Phone, Hash, Search } from 'lucide-react';
import { Alert } from '../ui/Alert';

export type PickupSearchType = 'phone' | 'code';

export interface PickupSearchFormProps {
  onSearch: (type: PickupSearchType, value: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export const PickupSearchForm: React.FC<PickupSearchFormProps> = ({
  onSearch,
  loading,
  error,
  className,
}) => {
  const [tab, setTab] = React.useState<PickupSearchType>('phone');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [errors, setErrors] = React.useState<{ phone?: string; code?: string }>({});

  const [localError, setLocalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const isLoading = loading || submitting;

  const validatePhone = (v: string) => {
    if (!v.trim()) return '请输入手机号';
    if (!/^1[3-9]\d{9}$/.test(v.trim())) return '请输入正确的11位手机号';
    return undefined;
  };

  const validateCode = (v: string) => {
    if (!v.trim()) return '请输入取件码';
    if (v.trim().length < 4) return '取件码长度至少4位';
    return undefined;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = tab === 'phone' ? phone.trim() : code.trim();
    const fieldError = tab === 'phone' ? validatePhone(phone) : validateCode(code);
    if (fieldError) {
      setErrors(tab === 'phone' ? { phone: fieldError } : { code: fieldError });
      return;
    }
    setErrors({});
    setSubmitting(true);
    setLocalError(null);
    try {
      await onSearch(tab, value);
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('w-full max-w-xl mx-auto', className)}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">取件查询</h2>
        <p className="text-sm text-slate-500 mt-1">请输入手机号或取件码查询您的衣物</p>
      </div>

      {(error || localError) && (
        <div className="mb-4">
          <Alert variant="danger" title="查询失败" message={error || localError || ''} />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <Tabs value={tab} onChange={(v) => setTab(v as PickupSearchType)}>
          <TabList className="grid grid-cols-2">
            <Tab value="phone" className="flex items-center justify-center gap-2 py-3.5 text-sm">
              <Phone className="w-4 h-4" />
              手机号
            </Tab>
            <Tab value="code" className="flex items-center justify-center gap-2 py-3.5 text-sm">
              <Hash className="w-4 h-4" />
              取件码
            </Tab>
          </TabList>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <TabPanel value="phone">
              <Input
                label="手机号"
                icon={Phone}
                placeholder="请输入11位手机号"
                type="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                error={errors.phone}
                inputClassName="text-lg h-14 px-4 text-center tracking-widest"
              />
            </TabPanel>

            <TabPanel value="code">
              <Input
                label="取件码"
                icon={Hash}
                placeholder="请输入取件码"
                type="text"
                maxLength={20}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                }}
                error={errors.code}
                inputClassName="text-lg h-14 px-4 text-center tracking-widest font-mono"
              />
            </TabPanel>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full h-14 text-base flex items-center justify-center gap-2"
            >
              <Search className={cn('w-5 h-5', isLoading && 'invisible')} />
              查询取件
            </Button>
          </form>
        </Tabs>
      </div>
    </div>
  );
};
