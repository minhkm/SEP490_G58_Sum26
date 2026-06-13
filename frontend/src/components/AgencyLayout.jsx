import React from 'react';
import AgencySidebar from './AgencySidebar';
import './AgencyLayout.css';
import { useLocation } from 'react-router-dom';

export default function AgencyLayout({ children }) {
  const location = useLocation();
  // Các trang này đã tự quản lý thanh cuộn bên trong (để giữ Header đứng im)
  const isSharedPage = location.pathname.includes('/voyages') || location.pathname.includes('/cargos');

  return (
    <div className="agency-layout">
      <AgencySidebar />
      <main className="agency-main-content" style={{ overflowY: isSharedPage ? 'hidden' : 'auto', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
