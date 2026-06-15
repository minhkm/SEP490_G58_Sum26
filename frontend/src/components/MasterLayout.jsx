import React from 'react';
import Sidebar from './Sidebar';

export default function MasterLayout({ children }) {
  return (
    <div className="master-layout" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f4f7fb', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
