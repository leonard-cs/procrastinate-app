import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useUserContext } from '../contexts/UserContext';
import { AuthService } from '../../services/AuthService';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import { useTaskContext } from '../contexts/TaskContext';
import { useBuddyContext } from '../contexts/BuddyContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const user = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get context refresh functions (kept as fallback for manual refresh)
  const { getTasksList } = useTaskContext();
  const { refreshBuddyData } = useBuddyContext();

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle pull-to-refresh as a fallback mechanism (real-time listeners handle automatic updates)
  const handleRefresh = async () => {
    try {
      // Force refresh tasks (fallback for real-time listeners)
      await getTasksList();
      
      // Force refresh buddy data if on buddy page (fallback for real-time listeners)
      if (location.pathname === '/buddy') {
        await refreshBuddyData();
      }
      
      // Add a small delay for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Refresh error:', error);
      // Don't throw error to prevent showing error state in pull-to-refresh
    }
  };

  // Handle clicking outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Study Buddy</h1>
            </div>
            
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-700 font-medium">
                    {user.displayName || 'User'}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content area with bottom padding for navigation */}
      <div className="overflow-auto h-screen">
        <div className="pb-16 pt-4">
          {children}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Layout; 