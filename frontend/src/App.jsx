import React, { useState, useEffect } from 'react';
import StorePage from './pages/StorePage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  // Sync page with browser URL hash: '#/store' (demo website page) vs '#/dashboard' or '#/admin' (admin dashboard)
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('dashboard') || hash.includes('sre') || hash.includes('admin')) {
        return 'dashboard';
      }
    }
    return 'store';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('dashboard') || hash.includes('sre') || hash.includes('admin')) {
        setCurrentPage('dashboard');
      } else {
        setCurrentPage('store');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page) => {
    window.location.hash = `#/${page}`;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#EDE7DC]">
      {currentPage === 'store' ? (
        <StorePage onNavigateToDashboard={() => navigateTo('dashboard')} />
      ) : (
        <DashboardPage onNavigateToStore={() => navigateTo('store')} />
      )}
    </div>
  );
}
