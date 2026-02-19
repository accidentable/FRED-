import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

type Mode = 'login' | 'signup';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpDone, setSignUpDone] = useState(false);

  const { signIn, signUp, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
      setSignUpDone(true);
    }
  };

  const switchMode = (next: Mode) => {
    clearError();
    setSignUpDone(false);
    setMode(next);
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-primary font-mono flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-terminal-green text-xs leading-relaxed">
          <pre>{`+------------------------------------------+
|   FRED-OS  INVESTMENT TERMINAL v1.0.0   |
|         AI-POWERED ADVISOR              |
+------------------------------------------+`}</pre>
        </div>

        {/* Mode Tabs */}
        <div className="flex mb-6 border border-terminal-gray">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs tracking-widest transition-colors ${
              mode === 'login'
                ? 'bg-terminal-green text-terminal-bg font-bold'
                : 'text-terminal-dim hover:text-terminal-primary'
            }`}
          >
            [ LOGIN ]
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-xs tracking-widest transition-colors ${
              mode === 'signup'
                ? 'bg-terminal-green text-terminal-bg font-bold'
                : 'text-terminal-dim hover:text-terminal-primary'
            }`}
          >
            [ REGISTER ]
          </button>
        </div>

        {/* Sign-up success message */}
        {signUpDone && !error && (
          <div className="mb-4 p-3 border border-terminal-green text-terminal-green text-xs">
            {'>'} 가입 완료. 이메일을 확인해 인증 링크를 클릭하세요.
            <br />
            {'>'} 인증 후 LOGIN 탭에서 로그인하세요.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 border border-terminal-red text-terminal-red text-xs">
            {'>'} ERR: {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-terminal-dim mb-1 tracking-widest">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="user@example.com"
              className="w-full bg-terminal-black border border-terminal-gray px-3 py-2 text-xs text-terminal-primary placeholder-terminal-dim focus:outline-none focus:border-terminal-green transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-dim mb-1 tracking-widest">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-terminal-black border border-terminal-gray px-3 py-2 text-xs text-terminal-primary placeholder-terminal-dim focus:outline-none focus:border-terminal-green transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-terminal-green text-terminal-bg text-xs font-bold tracking-widest hover:bg-terminal-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {isLoading
              ? '> PROCESSING...'
              : mode === 'login'
              ? '> LOGIN'
              : '> CREATE ACCOUNT'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-terminal-dim">
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="text-terminal-green hover:underline"
          >
            {mode === 'login' ? 'REGISTER' : 'LOGIN'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
