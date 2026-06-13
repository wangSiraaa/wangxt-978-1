import * as React from 'react';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppLayoutProps {
  activeKey: string;
  onMenuSelect: (key: string) => void;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeKey,
  onMenuSelect,
  title,
  subtitle,
  actions,
  children,
  className,
}) => {
  return (
    <div className={cn('flex h-screen w-full bg-slate-50', className)}>
      <Sidebar activeKey={activeKey} onSelect={onMenuSelect} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
