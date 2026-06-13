import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Layers,
  ClipboardCheck,
  PackageSearch,
  DollarSign,
  AlertTriangle,
  ArrowLeftRight,
  Wallet,
  LogOut,
  User,
  Shirt,
} from 'lucide-react';
import { useAuthStore, type AuthRole } from '../../store/useAuthStore';
import { Badge } from '../ui/Badge';

export interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AuthRole[];
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'batches', label: '批次列表', icon: Layers, roles: ['staff', 'manager'] },
  { key: 'qc-board', label: '质检看板', icon: ClipboardCheck, roles: ['staff', 'manager'] },
  { key: 'pickup-verify', label: '取件校验', icon: PackageSearch, roles: ['customer', 'cashier'] },
  { key: 'overdue-fee', label: '超期收费', icon: DollarSign, roles: ['manager', 'cashier'] },
  { key: 'exceptions', label: '异常处理', icon: AlertTriangle, roles: ['manager'] },
  { key: 'transfer', label: '调拨外包', icon: ArrowLeftRight, roles: ['manager'] },
  { key: 'cashier-confirm', label: '收银确认', icon: Wallet, roles: ['cashier'] },
];

const ROLE_LABELS: Record<Exclude<AuthRole, null>, string> = {
  staff: '店员',
  customer: '顾客',
  manager: '店长',
  cashier: '收银',
};

export interface SidebarProps {
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeKey, onSelect, className }) => {
  const { currentRole, currentUser, logout } = useAuthStore();

  const visibleItems = React.useMemo(
    () => MENU_ITEMS.filter((item) => item.roles.includes(currentRole)),
    [currentRole]
  );

  return (
    <aside
      className={cn(
        'flex flex-col w-64 h-full bg-slate-900 text-slate-100 border-r border-slate-800',
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
          <Shirt className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold">洁净洗衣管理系统</div>
          <div className="text-xs text-slate-400">Industrial Laundry</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors',
                isActive
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant="accent" className="text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 py-3 rounded-md bg-slate-800/50 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{currentUser?.name || '未登录'}</div>
              <div className="text-xs text-slate-400">
                {currentRole ? ROLE_LABELS[currentRole] : '未知角色'} · {currentUser?.empId || '-'}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
};
