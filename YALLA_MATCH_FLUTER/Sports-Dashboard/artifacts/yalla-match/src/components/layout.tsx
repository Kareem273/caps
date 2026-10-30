import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { 
  CalendarDays, 
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { NavigationBar } from './navigation-bar';
import { useTheme } from '@/context/theme-context';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const { theme, toggleTheme } = useTheme();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const userRole = localStorage.getItem('yalla-admin-role') || 'Admin';

  useEffect(() => {
    const storedCount = Number(sessionStorage.getItem('yalla-pending-refund-requests') || '0');
    setPendingRequestsCount(Number.isFinite(storedCount) ? storedCount : 0);
    const onCountChanged = (event: Event) => {
      const count = Number((event as CustomEvent<number>).detail);
      setPendingRequestsCount(Number.isFinite(count) ? count : 0);
    };
    window.addEventListener('yalla-refund-request-count', onCountChanged);
    return () => window.removeEventListener('yalla-refund-request-count', onCountChanged);
  }, []);

  return (
    <div className="liquid-dashboard-shell flex h-screen overflow-hidden bg-background">
      {/* Sleek Floating Responsive Navigation Bar (Desktop Vertical Sidebar + Mobile Bottom Dock) */}
      <NavigationBar pendingRefundsCount={pendingRequestsCount} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="liquid-topbar flex h-16 items-center justify-between px-4 md:px-6 z-10 shrink-0 border-b border-border/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile Brand indicator */}
            <div className="flex items-center gap-2.5 md:hidden">
              <img
                src="/logo.png"
                alt="ElSewedy Logo"
                className="w-7 h-7 rounded-full object-cover shadow-md shadow-red-500/20 shrink-0"
              />
              <div className="flex items-center gap-1 font-bold text-sm tracking-tight">
                <span className="text-[#22C55E]">ElSewedy</span>
                <span className="text-foreground">Yalla Match</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <span>{today}</span>
            </div>
          </div>
          
          <div className="flex flex-1 items-center justify-end gap-2.5 md:gap-4">
            {/* Light / Dark Mode Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="relative cursor-pointer bg-card hover:bg-muted text-foreground border border-border shadow-xs transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400 transition-all rotate-0 scale-100" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-700 transition-all rotate-0 scale-100" />
              )}
            </Button>

            <Link href="/refunds">
              <Button
                variant="outline"
                size="icon"
                className="relative cursor-pointer bg-card hover:bg-muted text-foreground border border-border shadow-xs transition-colors"
              >
                <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
            </Link>

            <div className="flex items-center gap-3 pl-2.5 border-l border-border/60">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">{localStorage.getItem('yalla-admin-email') || 'Admin'}</span>
                <Badge variant={userRole === 'SuperAdmin' ? 'default' : 'secondary'} className="text-[10px] h-4 rounded-full px-1.5">
                  {userRole === 'SuperAdmin' ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
              <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold">
                  {userRole === 'SuperAdmin' ? 'SA' : 'AD'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content: padding bottom on mobile ensures floating bottom nav bar never obscures content */}
        <main className="liquid-main-surface flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
