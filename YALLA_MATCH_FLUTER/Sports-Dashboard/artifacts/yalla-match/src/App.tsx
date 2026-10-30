import { useState, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Dashboard from '@/pages/dashboard';
import Reservations from '@/pages/reservations';
import Courts from '@/pages/courts';
import CheckIn from '@/pages/check-in';
import Refunds from '@/pages/refunds';
import Activity from '@/pages/activity';
import { BlockedSlotsProvider } from '@/context/blocked-slots-context';
import { ThemeProvider } from '@/context/theme-context';
import { login } from '@/lib/yalla-api';

const queryClient = new QueryClient();

type RouterProps = { authenticated: boolean; };
function Router({ authenticated }: RouterProps) {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/courts" component={Courts} />
      <Route path="/time-slots" component={Reservations} />
      <Route path="/check-in" component={CheckIn} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/activity" component={Activity} />
      <Route component={NotFound} />
    </Switch>
  );
}

function LoginPage({ onLogin }: { onLogin: (token: string, email: string) => void }) {
  const [email, setEmail] = useState('admin@yallamatch.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const session = await login(email, password);
      onLogin(session.token, session.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="login-logo flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm bg-emerald-600">
            <span className="font-extrabold text-white text-lg font-sans">E</span>
          </div>
          <div className="flex flex-col justify-center text-left">
            <div className="flex items-center gap-1 font-bold text-xl tracking-tight leading-none">
              <span className="text-white">Yalla</span>
              <span className="text-emerald-400">Match</span>
            </div>
            <span className="text-[10px] tracking-wider text-emerald-400/90 font-medium mt-0.5">by zspark</span>
          </div>
        </div>
        <div className="login-copy">
          <p className="eyebrow">FACILITY MANAGEMENT</p>
          <h1>Everything your sports venue needs, in one place.</h1>
          <p>Manage reservations, live availability and customer check-ins with confidence.</p>
          <div className="login-points"><span>✓ Live reservations</span><span>✓ Secure payments</span><span>✓ Fast QR check-in</span></div>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-card">
          <div className="mobile-brand flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs bg-emerald-600">E</div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-base leading-none">Yalla Match</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">by zspark</span>
            </div>
          </div>
          <p className="eyebrow">ADMIN PORTAL</p>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to continue to your dashboard.</p>
          <label>Email address<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@company.com" required /></label>
          <label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Enter your password" required /></label>
          {error && <p className="login-error">{error}</p>}
          <button className="login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in to dashboard'} <span>→</span></button>
          <p className="login-help">Yalla Match by zspark · Secure admin access</p>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('yalla-admin-token'));
  });

  const handleLogin = (token: string, email: string) => {
    localStorage.setItem('yalla-admin-token', token);
    localStorage.setItem('yalla-admin-email', email);
    setAuthenticated(true);
  };

  if (!authenticated) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BlockedSlotsProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router authenticated={authenticated} />
            </WouterRouter>
          </BlockedSlotsProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
