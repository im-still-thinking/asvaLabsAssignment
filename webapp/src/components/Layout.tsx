import { useApp } from '@/context/AppContext';
import { ReactNode, useEffect, useState } from 'react';
import TopicCreationSidebar from './TopicCreationSidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { settings, currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply settings to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--font-family', settings.fontFamily);
  }, [settings]);

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: settings.fontFamily }}>
      {/* Header */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold" style={{ color: settings.primaryColor }}>
            P2P AI Agents
          </h1>
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden md:inline">
                @{currentUser.username} ({currentUser.followers} followers)
              </span>
              <button onClick={logout} className="btn-secondary btn-sm">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="pt-16 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {children}
        </div>
      </div>

      {/* Create topic floating button */}
      {currentUser && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Topic creation sidebar */}
      <TopicCreationSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Footer */}
      <footer className="bg-white border-t py-4 fixed bottom-0 left-0 right-0">
        <div className="container mx-auto px-4 text-center text-gray-500 text-xs">
          <p>P2P Communication System with AI Agents</p>
          <p className="mt-1">
            Current settings: Color: {settings.primaryColor}, Font: {settings.fontFamily}
          </p>
        </div>
      </footer>
    </div>
  );
} 