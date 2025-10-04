import { ReactNode } from 'react';
import Header from './Header.tsx';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="px-6 py-8">
        {children}
      </main>
    </div>
  );
}
