import { Outlet } from 'react-router'
import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { cn } from '@/lib/utils'

interface LayoutProps {
  className?: string
}

/**
 * Main layout wrapper for authenticated pages.
 * Includes header, sidebar (desktop and mobile), and main content area.
 */
export function Layout({ className }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="md:pl-64">
        <Header
          showMobileMenuButton
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-64px)] overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
