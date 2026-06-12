import React from 'react';
import AgencySidebar from './AgencySidebar';
import './AgencyLayout.css';

export default function AgencyLayout({ children }) {
  return (
    <div className="agency-layout">
      <AgencySidebar />
      <main className="agency-main-content">
        {children}
      </main>
    </div>
  );
}
