import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, User, UserCheck, Wallet, ArrowRight, Shirt } from 'lucide-react';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { AuthRole } from '../store/useAuthStore';

interface RoleOption {
  key: AuthRole;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'staff',
    name: '店员',
    description: '管理批次录入、质检操作、衣物处理',
    icon: UserCog,
    accent: 'from-primary-500 to-primary-700',
  },
  {
    key: 'customer',
    name: '顾客',
    description: '查询取件、查看订单、扫码取件',
    icon: User,
    accent: 'from-accent-500 to-accent-700',
  },
  {
    key: 'manager',
    name: '店长',
    description: '全功能管理、异常处理、调拨外包',
    icon: UserCheck,
    accent: 'from-success-500 to-success-700',
  },
  {
    key: 'cashier',
    name: '收银',
    description: '费用核算、收银确认、日结管理',
    icon: Wallet,
    accent: 'from-slate-500 to-slate-700',
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();

  const handleSelectRole = (role: AuthRole) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-accent-500 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-primary-400 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full bg-success-500 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-lg shadow-accent-500/30 mb-4">
            <Shirt className="w-8 h-8 text-primary-900" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            洁净洗衣管理系统
          </h1>
          <p className="text-primary-200 text-lg">
            Industrial Laundry Management System
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.key}
                className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer transition-all duration-300"
                onClick={() => handleSelectRole(option.key)}
              >
                <CardBody className="p-6">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.accent} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {option.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                    {option.description}
                  </p>
                  <Button
                    variant="primary"
                    className="w-full group"
                    onClick={() => handleSelectRole(option.key)}
                  >
                    进入系统
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-primary-300">
          选择您的角色登录进入系统
        </div>
      </div>
    </div>
  );
}
