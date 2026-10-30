import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  QrCode,
  Activity,
  Bell,
  LogOut,
} from 'lucide-react';
import { Button } from './ui/button';

export type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
};

export const defaultNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarDays, label: 'Reservations', path: '/reservations' },
  { icon: MapPin, label: 'Courts', path: '/courts' },
  { icon: QrCode, label: 'Check-in', path: '/check-in' },
  { icon: Activity, label: 'Activity', path: '/activity' },
  { icon: Bell, label: 'Refunds', path: '/refunds' },
];

interface NavigationBarProps {
  pendingRefundsCount?: number;
  className?: string;
}

export function NavigationBar({ pendingRefundsCount = 0, className = '' }: NavigationBarProps) {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();

  const items: NavItem[] = defaultNavItems.map((item) => ({
    ...item,
    badge: item.path === '/refunds' && pendingRefundsCount > 0 ? pendingRefundsCount : undefined,
  }));

  return (
    <>
      {/* =========================================================================
          DESKTOP: Adaptive Sidebar (Light White / Dark Black)
          ========================================================================= */}
      <aside
        aria-label="Desktop navigation sidebar"
        className={`hidden md:flex flex-col w-64 h-screen
          bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl
          z-30 overflow-hidden shrink-0 transition-colors duration-200 ${className}`}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ElSewedy Logo"
              className="w-9 h-9 rounded-full object-cover shadow-lg shadow-red-500/20 shrink-0"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 font-bold text-lg tracking-tight leading-none text-sidebar-foreground">
                <span className="text-[#22C55E] font-black">ElSewedy</span>
                <span>Sports</span>
              </div>
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold mt-1">Yalla Match</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <nav className="space-y-1.5" role="navigation">
            {items.map((item) => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? 'text-sidebar-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  {/* Active Item Background Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-pill"
                      className="absolute inset-0 rounded-xl bg-sidebar-accent border border-sidebar-border shadow-xs"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }
                      }
                    />
                  )}

                  <item.icon
                    className={`relative z-10 w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground group-hover:text-sidebar-foreground'
                    }`}
                  />
                  <span className="relative z-10 text-sm tracking-wide flex-1">
                    {item.label}
                  </span>

                  {item.badge !== undefined && (
                    <span className="relative z-10 text-[11px] font-bold bg-amber-500 text-white rounded-full px-2 py-0.5 shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors duration-200 border border-transparent hover:border-red-500/20"
            onClick={() => {
              localStorage.removeItem('yalla-admin-token');
              localStorage.removeItem('yalla-admin-email');
              localStorage.removeItem('yalla-admin-role');
              window.location.assign('/');
            }}
          >
            <LogOut className="mr-2.5 h-4 w-4" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE: Adaptive Floating Bottom Navigation Bar
          ========================================================================= */}
      <nav
        aria-label="Mobile floating navigation bar"
        className="md:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-0 mx-auto z-50
          w-[calc(100%-2rem)] max-w-sm rounded-full p-1.5
          bg-background/95 backdrop-blur-2xl border border-border shadow-2xl
          flex items-center justify-between transition-colors duration-200"
        style={{
          left: 0,
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: 'calc(100% - 2rem)',
          maxWidth: '24rem',
        }}
      >
        {items.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 outline-none ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Active Indicator Pill */}
              {isActive && (
                <motion.div
                  layoutId="mobile-active-pill"
                  className="absolute inset-0 rounded-full bg-accent border border-border shadow-xs"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }
                  }
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-background animate-pulse" />
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
