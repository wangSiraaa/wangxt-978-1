import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Truck, UserPlus, Inbox, Calendar, Phone } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusTag } from '../components/ui/StatusTag';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../store/useAppStore';
import type { ClothingItem } from '../types';
import { TransferStatus } from '../types';

const TAB_ITEMS = [
  { key: 'store', label: '门店调拨', icon: Building2 },
  { key: 'outsource', label: '外包洗护', icon: Truck },
  { key: 'auth', label: '代取授权', icon: UserPlus },
];

const MOCK_OUTSOURCERS = [
  { id: 'OS001', name: '蓝天专业洗护中心' },
  { id: 'OS002', name: '瑞洁奢侈品护理' },
  { id: 'OS003', name: '洁丽大型水洗厂' },
];

interface AuthRecord {
  id: string;
  authorizerPhone: string;
  authorizedName: string;
  authorizedPhone: string;
  idCardNo: string;
  batchNos: string[];
  validFrom: string;
  validTo: string;
  status: 'active' | 'expired' | 'cancelled';
}

const MOCK_AUTHS: AuthRecord[] = [
  {
    id: 'AU001',
    authorizerPhone: '13800138000',
    authorizedName: '张三',
    authorizedPhone: '13900139000',
    idCardNo: '110101********1234',
    batchNos: ['B20240115001'],
    validFrom: '2024-01-15',
    validTo: '2024-01-20',
    status: 'active',
  },
];

export default function TransferOutsource() {
  const navigate = useNavigate();
  const batches = useAppStore((s) => s.batches);
  const clothingItems = useAppStore((s) => s.clothingItems);
  const stores = useAppStore((s) => s.stores);
  const transfers = useAppStore((s) => s.transfers);
  const createTransfer = useAppStore((s) => s.createTransfer);

  const [activeTab, setActiveTab] = React.useState('store');
  const [fromStore, setFromStore] = React.useState(stores[0]?.id ?? '');
  const [toStore, setToStore] = React.useState(stores[1]?.id ?? '');
  const [outsourcer, setOutsourcer] = React.useState('OS001');
  const [selectedItemIds, setSelectedItemIds] = React.useState<string[]>([]);

  const [authorizerPhone, setAuthorizerPhone] = React.useState('');
  const [authorizedName, setAuthorizedName] = React.useState('');
  const [authorizedPhone, setAuthorizedPhone] = React.useState('');
  const [idCardNo, setIdCardNo] = React.useState('');
  const [validFrom, setValidFrom] = React.useState('');
  const [validTo, setValidTo] = React.useState('');
  const [selectedBatchNos, setSelectedBatchNos] = React.useState<string[]>([]);

  const allClothing: (ClothingItem & { batchNo: string })[] = React.useMemo(() => {
    return batches.flatMap((b) =>
      clothingItems
        .filter((c) => c.batchId === b.id)
        .map((c) => ({ ...c, batchNo: b.batchNo }))
    );
  }, [batches, clothingItems]);

  const storeNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [stores]);

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

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleBatch = (no: string) => {
    setSelectedBatchNos((prev) =>
      prev.includes(no) ? prev.filter((x) => x !== no) : [...prev, no]
    );
  };

  const handleCreateTransfer = () => {
    if (activeTab === 'store') {
      createTransfer(fromStore, toStore, selectedItemIds, 'current_user');
      alert(
        `已创建门店调拨单：从 ${storeNameMap[fromStore]} 到 ${storeNameMap[toStore]}，共 ${selectedItemIds.length} 件衣物`
      );
    } else {
      alert(
        `已创建外包洗护单：委托 ${MOCK_OUTSOURCERS.find((o) => o.id === outsourcer)?.name}，共 ${selectedItemIds.length} 件衣物`
      );
    }
    setSelectedItemIds([]);
  };

  const handleCreateAuth = () => {
    if (!authorizerPhone || !authorizedName || !authorizedPhone || !validFrom || !validTo) {
      alert('请填写完整的授权信息');
      return;
    }
    alert('代取授权创建成功');
    setAuthorizerPhone('');
    setAuthorizedName('');
    setAuthorizedPhone('');
    setIdCardNo('');
    setValidFrom('');
    setValidTo('');
    setSelectedBatchNos([]);
  };

  return (
    <AppLayout
      activeKey="transfer"
      onMenuSelect={handleMenuSelect}
      title="调拨外包"
      subtitle="管理门店间调拨、外包洗护和代取授权"
    >
      <div className="space-y-4">
        <Tabs items={TAB_ITEMS} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === 'store' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 space-y-4">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">调拨信息</CardTitle>
                </CardHeader>
                <CardBody className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">调出门店</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                      value={fromStore}
                      onChange={(e) => setFromStore(e.target.value)}
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">调入门店</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                      value={toStore}
                      onChange={(e) => setToStore(e.target.value)}
                    >
                      {stores.filter((s) => s.id !== fromStore).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="w-full" onClick={handleCreateTransfer} disabled={selectedItemIds.length === 0}>
                    创建调拨单（{selectedItemIds.length}）
                  </Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">运输状态跟踪</CardTitle>
                </CardHeader>
                <CardBody className="p-0 max-h-64 overflow-y-auto">
                  {transfers.length === 0 ? (
                    <div className="p-6">
                      <EmptyState icon={Truck} title="暂无调拨记录" size="sm" />
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transfers.map((t) => (
                        <div key={t.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-medium text-primary-600">{t.id}</span>
                            <StatusTag status={t.status} statusMap={{
                              [TransferStatus.PENDING]: { label: '待发', variant: 'warning' },
                              [TransferStatus.IN_TRANSIT]: { label: '运输中', variant: 'warning' },
                              [TransferStatus.RECEIVED]: { label: '已签收', variant: 'success' },
                              [TransferStatus.CANCELLED]: { label: '已取消', variant: 'danger' },
                            }} />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {storeNameMap[t.fromStoreId] ?? t.fromStoreId} → {storeNameMap[t.toStoreId] ?? t.toStoreId}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {t.createdAt instanceof Date ? t.createdAt.toLocaleString() : String(t.createdAt)} · {t.clothingIds.length} 件
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="col-span-8">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">选择调拨衣物（{selectedItemIds.length}）</CardTitle>
                </CardHeader>
                <CardBody className="p-0 max-h-[60vh] overflow-y-auto">
                  {allClothing.length === 0 ? (
                    <div className="p-6">
                      <EmptyState icon={Inbox} title="暂无衣物" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left w-10"></th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">批次号</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">条码</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">衣物类型</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">颜色</th>
                          <th className="px-4 py-2.5 text-right font-medium text-slate-600">价格</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allClothing.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <Checkbox
                                checked={selectedItemIds.includes(item.id)}
                                onChange={() => toggleItem(item.id)}
                              />
                            </td>
                            <td className="px-4 py-2.5 font-mono text-primary-600">{item.batchNo}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{item.barcode}</td>
                            <td className="px-4 py-2.5 text-slate-700">{item.clothingType}</td>
                            <td className="px-4 py-2.5 text-slate-600">{item.color}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">¥{item.basePrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'outsource' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 space-y-4">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">外包信息</CardTitle>
                </CardHeader>
                <CardBody className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">外包服务商</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-400"
                      value={outsourcer}
                      onChange={(e) => setOutsourcer(e.target.value)}
                    >
                      {MOCK_OUTSOURCERS.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">发出时间</label>
                    <Input type="datetime-local" value="" onChange={() => {}} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">预计收回时间</label>
                    <Input type="datetime-local" value="" onChange={() => {}} />
                  </div>
                  <Button className="w-full" onClick={handleCreateTransfer} disabled={selectedItemIds.length === 0}>
                    创建外包单（{selectedItemIds.length}）
                  </Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">外包记录</CardTitle>
                </CardHeader>
                <CardBody className="p-0 max-h-64 overflow-y-auto">
                  <div className="p-6">
                    <EmptyState icon={Truck} title="暂无外包记录" size="sm" />
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="col-span-8">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">选择外包衣物（{selectedItemIds.length}）</CardTitle>
                </CardHeader>
                <CardBody className="p-0 max-h-[60vh] overflow-y-auto">
                  {allClothing.length === 0 ? (
                    <div className="p-6">
                      <EmptyState icon={Inbox} title="暂无衣物" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left w-10"></th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">批次号</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">条码</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">衣物类型</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">颜色</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">洗护要求</th>
                          <th className="px-4 py-2.5 text-right font-medium text-slate-600">价格</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allClothing.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <Checkbox
                                checked={selectedItemIds.includes(item.id)}
                                onChange={() => toggleItem(item.id)}
                              />
                            </td>
                            <td className="px-4 py-2.5 font-mono text-primary-600">{item.batchNo}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">{item.barcode}</td>
                            <td className="px-4 py-2.5 text-slate-700">{item.clothingType}</td>
                            <td className="px-4 py-2.5 text-slate-600">{item.color}</td>
                            <td className="px-4 py-2.5 text-slate-600 text-xs">{item.washProject || '-'}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">¥{item.basePrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">新建代取授权</CardTitle>
                </CardHeader>
                <CardBody className="p-4 space-y-3">
                  <Input
                    label="授权人手机号"
                    icon={Phone}
                    placeholder="请输入授权人手机号"
                    value={authorizerPhone}
                    onChange={(e) => setAuthorizerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  />
                  <Input
                    label="被授权人姓名"
                    placeholder="请输入被授权人姓名"
                    value={authorizedName}
                    onChange={(e) => setAuthorizedName(e.target.value)}
                  />
                  <Input
                    label="被授权人手机号"
                    icon={Phone}
                    placeholder="请输入被授权人手机号"
                    value={authorizedPhone}
                    onChange={(e) => setAuthorizedPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  />
                  <Input
                    label="被授权人身份证号"
                    placeholder="请输入身份证号（可选）"
                    value={idCardNo}
                    onChange={(e) => setIdCardNo(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="生效日期"
                      type="date"
                      icon={Calendar}
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                    <Input
                      label="失效日期"
                      type="date"
                      icon={Calendar}
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      授权批次（{selectedBatchNos.length}）
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                      {batches.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                          <Checkbox
                            checked={selectedBatchNos.includes(b.batchNo)}
                            onChange={() => toggleBatch(b.batchNo)}
                          />
                          <span className="font-mono text-sm text-primary-600">{b.batchNo}</span>
                          <span className="text-sm text-slate-500">{b.customerName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateAuth}>
                    创建代取授权
                  </Button>
                </CardBody>
              </Card>
            </div>

            <div className="col-span-7">
              <Card>
                <CardHeader className="px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-sm font-semibold">授权记录</CardTitle>
                </CardHeader>
                <CardBody className="p-0 max-h-[70vh] overflow-y-auto">
                  {MOCK_AUTHS.length === 0 ? (
                    <div className="p-6">
                      <EmptyState icon={UserPlus} title="暂无授权记录" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">授权人</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">被授权人</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">授权批次</th>
                          <th className="px-4 py-2.5 text-left font-medium text-slate-600">有效期</th>
                          <th className="px-4 py-2.5 text-center font-medium text-slate-600">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {MOCK_AUTHS.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <div className="text-slate-700">{a.authorizerPhone}</div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="text-slate-700">{a.authorizedName}</div>
                              <div className="text-xs text-slate-400 font-mono">{a.authorizedPhone}</div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-primary-600 text-sm">
                              {a.batchNos.join(', ')}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 text-xs">
                              {a.validFrom} ~ {a.validTo}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <StatusTag status={a.status} statusMap={{
                                active: { label: '有效', variant: 'success' },
                                expired: { label: '已过期', variant: 'warning' },
                                cancelled: { label: '已取消', variant: 'danger' },
                              }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
