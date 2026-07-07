import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOutlined } from '@ant-design/icons';
import { notificationService } from '../services/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [items, unread] = await Promise.all([
        notificationService.getAll(20),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(unread.count || 0);
    } catch (error) {
      console.error('Unable to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  };

  const handleRead = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        await loadNotifications();
      } catch (error) {
        console.error('Unable to mark notification as read:', error);
      }
    }

    if (notification.voyageId) {
      setOpen(false);
      navigate('/voyages');
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Unable to mark all notifications as read:', error);
    }
  };

  const formatTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button className="notification-bell-button" type="button" onClick={handleToggle} aria-label="Thong bao">
        <BellOutlined />
        {unreadCount > 0 && (
          <span className="notification-bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-header">
            <div>
              <h3>Thong bao</h3>
              <span>{unreadCount} chua doc</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={handleReadAll}>Doc tat ca</button>
            )}
          </div>

          <div className="notification-bell-list">
            {loading && <div className="notification-bell-empty">Dang tai thong bao...</div>}
            {!loading && notifications.length === 0 && (
              <div className="notification-bell-empty">Chua co thong bao nao</div>
            )}
            {!loading && notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-bell-item ${item.isRead ? '' : 'unread'}`}
                onClick={() => handleRead(item)}
              >
                <div className="notification-bell-item-top">
                  <span className="notification-bell-title">{item.title}</span>
                  <span className="notification-bell-time">{formatTime(item.createdAt)}</span>
                </div>
                <p>{item.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
