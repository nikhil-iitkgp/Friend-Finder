"use client";

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TopBar } from '@/components/dashboard/TopBar';
import { MobileSidebar } from '@/components/dashboard/MobileSidebar';
import { NotificationProvider } from '@/contexts/NotificationProvider';
import { CallModal } from '@/components/calls/CallModal';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard requireAuth={true}>
      <NotificationProvider>
        <div className="min-h-screen bg-background">
          {/* Desktop Sidebar */}
          <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64">
            <Sidebar />
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar 
            open={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />

          {/* Main Content */}
          <div className="lg:pl-64">
            {/* Top Bar */}
            <TopBar onMenuClick={() => setSidebarOpen(true)} />
            
            {/* Page Content */}
            <main className="flex-1">
              <div className="px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
        
        {/* Global Call Modal */}
        <CallModal />
      </NotificationProvider>
    </AuthGuard>
  );
}