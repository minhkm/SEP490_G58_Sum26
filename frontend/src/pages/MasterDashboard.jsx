import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MasterDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Master Dashboard</h1>
      {user && <p>Xin chào Thuyền trưởng: <strong>{user.fullName || user.username}</strong></p>}
      <p>Bạn đã đăng nhập thành công vào hệ thống với phân quyền Master!</p>
      <button 
        onClick={handleLogout} 
        style={{ 
          padding: '10px 20px', 
          cursor: 'pointer', 
          backgroundColor: '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          marginTop: '20px'
        }}>
        Đăng xuất
      </button>
    </div>
  );
}
