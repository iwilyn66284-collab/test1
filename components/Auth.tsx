
import React, { useState } from 'react';
import { AppState } from '../types';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthProps {
  state: AppState;
  onSuccess: () => void;
  onStateChange: (state: AppState) => void;
}

const Auth: React.FC<AuthProps> = ({ state, onSuccess, onStateChange }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [error, setError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    localStorage.setItem('bid_app_password', password);
    onSuccess();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = localStorage.getItem('bid_app_password');
    if (password === saved) {
      onSuccess();
    } else {
      setError('密码错误');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = localStorage.getItem('bid_app_password');
    if (oldPassword !== saved) {
      setError('原密码错误');
      return;
    }
    if (password !== confirmPassword) {
      setError('新密码确认不匹配');
      return;
    }
    localStorage.setItem('bid_app_password', password);
    setIsChangingPassword(false);
    setPassword('');
    setConfirmPassword('');
    setOldPassword('');
    setError('');
    alert('密码修改成功');
  };

  if (isChangingPassword) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <KeyRound className="text-indigo-600" /> 修改密码
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">原密码</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">新密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              保存修改
            </button>
            <button
              type="button"
              onClick={() => setIsChangingPassword(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-4">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {state === AppState.INITIAL_SETUP ? '欢迎使用 SmartBid AI' : '欢迎回来'}
        </h1>
        <p className="text-slate-500 mt-2">
          {state === AppState.INITIAL_SETUP ? '首次进入请设置您的访问密码' : '请输入密码以访问系统'}
        </p>
      </div>

      <form onSubmit={state === AppState.INITIAL_SETUP ? handleSetup : handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">访问密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {state === AppState.INITIAL_SETUP && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">确认密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
        >
          {state === AppState.INITIAL_SETUP ? '完成设置' : '立即登录'}
          <ArrowRight className="w-4 h-4" />
        </button>

        {state === AppState.LOGIN && (
          <button
            type="button"
            onClick={() => setIsChangingPassword(true)}
            className="w-full text-sm text-slate-400 hover:text-indigo-600 transition-colors mt-4"
          >
            修改访问密码？
          </button>
        )}
      </form>
    </div>
  );
};

export default Auth;
