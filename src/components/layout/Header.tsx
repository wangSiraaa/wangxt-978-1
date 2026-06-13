import * as React from 'react';
import { cn } from '../../lib/utils';
import { Bell, Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, className, actions }) => {
  return (
    <header
      className={cn(
        'flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-64">
          <Input placeholder="搜索..." icon={Search} />
        </div>

        {actions}

        <button
          type="button"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Bell className="w-5 h-5" />
          <Badge variant="danger" className="absolute -top-0.5 -right-0.5 text-[10px] px-1 py-0">
            3
          </Badge>
        </button>
      </div>
    </header>
  );
};
