import { useApp } from '@/context/AppContext';
import { ReactNode, useEffect, useState } from 'react';
import P2PInfoPanel from './P2PInfoPanel';
import TopicCreationSidebar from './TopicCreationSidebar';
import TopicsList from './TopicsList';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { settings, currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topicsListOpen, setTopicsListOpen] = useState(true);

  // Apply settings to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--font-family', settings.fontFamily);
  }, [settings]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: settings.fontFamily }}>
      {/* Header - Top Horizontal View */}
      <header 
        className="bg-white shadow-sm z-10 py-3 px-4"
        style={{ backgroundColor: settings.primaryColor, color: 'white' }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">
            P2P AI Agents
          </h1>
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm hidden md:inline">
                @{currentUser.username} ({currentUser.followers} followers)
              </span>
              <button onClick={logout} className="btn-secondary btn-sm text-white bg-opacity-20 hover:bg-opacity-30">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content - Center View */}
        <main className="flex-1 overflow-auto p-4">
          <div className="container mx-auto max-w-4xl">
            {children}
          </div>
        </main>

        {/* Topics Sidebar - Right Vertical View */}
        {currentUser && (
          <aside 
            className={`bg-white shadow-lg w-80 transition-all duration-300 flex flex-col ${
              topicsListOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold" style={{ color: settings.primaryColor }}>Topics</h2>
              <button 
                onClick={() => setTopicsListOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="w-full mb-4 btn btn-primary"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Create New Topic
              </button>
              
              <TopicsList />
            </div>
          </aside>
        )}
        
        {/* Toggle button for sidebar when closed */}
        {currentUser && !topicsListOpen && (
          <button
            onClick={() => setTopicsListOpen(true)}
            className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-l-md shadow-md"
            style={{ color: settings.primaryColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* P2P Info Panel - Bottom Horizontal View */}
      {currentUser && (
        <div className="border-t">
          <P2PInfoPanel />
        </div>
      )}

      {/* Topic creation sidebar */}
      <TopicCreationSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
    </div>
  );
} 