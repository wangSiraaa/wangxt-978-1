import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, DollarSign, Bell, Settings, Mail } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../store/useAppStore';
import { BatchStatus, OVERDUE_RULES, FeeChangeType } from '../types';
import { calcOverdueFee } from '../utils/feeCalc';
import { getOverdueDays, formatDate } from '../utils/dateUtil';

interface OverdueBatch {
  id: string;
  batchNo: string;
  customerName: string;
  customerPhone: string;
  expectedTime: Date;
  overdueDays: number;
  storageFee: number;
}

export default function OverdueCharge() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const clothingItems = useAppStore((s) => s.clothingItems);
  const applyFeeChange = useAppStore((s) => s.applyFeeChange);

  const [freeDays, setFreeDays] = React.useState(OVERDUE_RULES.freeDays);
  const [rate1, setRate1] = React.useState(OVERDUE_RULES.stage1Rate);
  const [rate2, setRate2] = React.useState(OVERDUE_RULES.stage2Rate);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const customRules = React.useMemo(
    () => ({ freeDays, stage1Days: 7 - freeDays, stage1Rate: rate1, stage2Rate: rate2 }),
    [freeDays, rate1, rate2]
  );

  const overdueBatches: OverdueBatch[] = React.useMemo(() => {
    const now = new Date();
    return batches
      .filter((b) => b.status === BatchStatus.READY || b.status === BatchStatus.OVERDUE)
      .map((b) => {
        const storageFee = calcOverdueFee(b.expectedTime, now, customRules);
        if (storageFee <= 0) return null;
        const overdueDays = getOverdueDays(b.expectedTime, now);
        if (overdueDays <= 0) return null;
        return {
          id: b.id,
          batchNo: b.batchNo,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          expectedTime: b.expectedTime,
          overdueDays,
          storageFee,
        };
      })
      .filter((x): x is OverdueBatch => x !== null)
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [batches, customRules]);

  const totalOverdue = overdueBatches.length;
  const totalFee = overdueBatches.reduce((sum, b) => sum + b.storageFee, 0);

  const handleMenuSelect = (key: string) => {
    switch (key) {
      case 'batches':
        navigate('/batches');
        break;
      case 'qc-board':
        navigate('/qc');
        break;
      case 'pickup-verify':
        navigate('/pickup');
        break;
      case 'overdue-fee':
        navigate('/overdue');
        break;
      case 'exceptions':
        navigate('/exceptions');
        break;
      case 'transfer':
        navigate('/transfer');
        break;
      case 'cashier-confirm':
        navigate('/cashier');
        break;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === overdueBatches.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(overdueBatches.map((b) => b.id));
    }
  };

  const sendBatchNotify = () => {
    alert(`已向 ${selectedIds.length} 个批次发送超期通知`);
  };

  const handleApplyFee = (batch: OverdueBatch) => {
    try {
      applyFeeChange(
        batch.id,
        FeeChangeType.OVERDUE,
        batch.storageFee,
        `超期保管费（超期${batch.overdueDays}天）`,
        'system'
      );
      alert(`已对批次 ${batch.batchNo} 计收超期费 ¥${batch.storageFee.toFixed(2)}`);
    } catch (e: any) {
      alert(`计收失败：${e.message}`);
    }
  };

  return (
    <AppLayout
      activeKey="overdue-fee"
      onMenuSelect={handleMenuSelect}
      title="超期收费"
      subtitle="管理超期未取件的批次，配置收费规则和发送通知"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">超期批次数</div>
                  <div className="text-3xl font-bold text-slate-800 mt-1">{totalOverdue}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">总超期费</div>
                  <div className="text-3xl font-bold text-accent-600 mt-1 font-mono">
                    ¥{totalFee.toFixed(2)}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-accent-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">今日通知数</div>
                  <div className="text-3xl font-bold text-slate-800 mt-1">
                    {Math.min(totalOverdue, 8)}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-success-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold">计费规则配置</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="p-4">
            <div className="grid grid-cols-5 gap-4">
              <Input
                label="免费存放（天）"
                type="number"
                value={String(freeDays)}
                onChange={(e) => setFreeDays(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <Input
                label={`1-${7 - freeDays}天（元/天）`}
                type="number"
                value={String(rate1)}
                onChange={(e) => setRate1(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <Input
                label={`${8 - freeDays}天以上（元/天）`}
                type="number"
                value={String(rate2)}
                onChange={(e) => setRate2(Math.max(0, parseFloat(e.target.value) || 0))}
              />
              <div className="flex items-end col-span-2">
                <Button variant="outline" className="w-full">
                  保存规则
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">超期批次列表</CardTitle>
              <Button
                variant="accent"
                onClick={sendBatchNotify}
                disabled={selectedIds.length === 0}
              >
                <Mail className="w-4 h-4 mr-1" />
                批量通知（{selectedIds.length}）
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {overdueBatches.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CalendarDays}
                  title="暂无超期批次"
                  description="当前所有批次均在免费存放期内"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <Checkbox
                          checked={selectedIds.length === overdueBatches.length && overdueBatches.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">批次号</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">顾客</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">联系电话</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">应取日期</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">超期天数</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">保管费</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overdueBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.includes(batch.id)}
                            onChange={() => toggleSelect(batch.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-primary-600">
                          {batch.batchNo}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{batch.customerName}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{batch.customerPhone}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(batch.expectedTime)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
                            超期 {batch.overdueDays} 天
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-accent-600">
                          ¥{batch.storageFee.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center space-x-1">
                          <Button variant="link" size="sm" onClick={() => alert(`已通知 ${batch.customerName}`)}>
                            发送通知
                          </Button>
                          <Button variant="link" size="sm" onClick={() => handleApplyFee(batch)}>
                            计收费
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
