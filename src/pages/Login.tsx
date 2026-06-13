import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Hash, Lock, Phone, Send, UserCog, User, UserCheck, Wallet, Shirt } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuthStore, type AuthRole } from '../store/useAuthStore';

const ROLE_META: Record<Exclude<AuthRole, null>, { name: string; icon: React.ComponentType<any>; accent: string }> = {
  staff: { name: '店员', icon: UserCog, accent: 'from-primary-500 to-primary-700' },
  customer: { name: '顾客', icon: User, accent: 'from-accent-500 to-accent-700' },
  manager: { name: '店长', icon: UserCheck, accent: 'from-success-500 to-success-700' },
  cashier: { name: '收银', icon: Wallet, accent: 'from-slate-500 to-slate-700' },
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role') as AuthRole;
  const role: AuthRole = roleParam && ['staff', 'customer', 'manager', 'cashier'].includes(roleParam) ? roleParam : 'staff';

  const login = useAuthStore((s) => s.login);

  const [empId, setEmpId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const roleMeta = ROLE_META[role];
  const Icon = roleMeta.icon;

  const isStaff = role !== 'customer';

  const handleSendCode = () => {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setCodeSent(true);
    setCountdown(60);
  };

  const handleLogin = () => {
    setError('');

    if (isStaff) {
      if (!empId.trim()) {
        setError('请输入工号');
        return;
      }
      if (!password.trim()) {
        setError('请输入密码');
        return;
      }
    } else {
      if (!/^1\d{10}$/.test(phone)) {
        setError('请输入正确的手机号');
        return;
      }
      if (!code.trim()) {
        setError('请输入验证码');
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      login(role, { username: isStaff ? empId : phone, password });
      setLoading(false);

      if (role === 'staff' || role === 'manager') {
        navigate('/batches');
      } else if (role === 'cashier') {
        navigate('/cashier');
      } else {
        navigate('/pickup');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-accent-500 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-primary-400 blur-3xl" />
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

      <div className="relative z-10 w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm text-primary-200 hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回角色选择
        </button>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleMeta.accent} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              {roleMeta.name}登录
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              洁净洗衣管理系统
            </p>
          </CardHeader>
          <CardBody className="pt-4 space-y-4">
            {isStaff ? (
              <>
                <Input
                  label="工号"
                  placeholder="请输入工号"
                  icon={Hash}
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  error={error.includes('工号') ? error : undefined}
                />
                <Input
                  label="密码"
                  type="password"
                  placeholder="请输入密码"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={error.includes('密码') ? error : undefined}
                />
              </>
            ) : (
              <>
                <Input
                  label="手机号码"
                  placeholder="请输入手机号"
                  icon={Phone}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                    setError('');
                  }}
                  error={error.includes('手机号') ? error : undefined}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="请输入验证码"
                      icon={Send}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      error={error.includes('验证码') ? error : undefined}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0}
                      className="whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    login('customer');
                    navigate('/pickup');
                  }}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 py-1"
                >
                  直接进入取件页 →
                </button>
              </>
            )}

            {error && !error.includes('工号') && !error.includes('密码') && !error.includes('手机号') && !error.includes('验证码') && (
              <p className="text-sm text-danger-600">{error}</p>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleLogin}
              loading={loading}
            >
              登 录
            </Button>
          </CardBody>
        </Card>

        <div className="mt-6 text-center flex items-center justify-center gap-2 text-sm text-primary-300">
          <Shirt className="w-4 h-4" />
          <span>洁净洗衣 · 专业洗护</span>
        </div>
      </div>
    </div>
  );
}
