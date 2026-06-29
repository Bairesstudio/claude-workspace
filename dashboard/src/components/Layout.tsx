import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
        <div key={location.pathname} className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
