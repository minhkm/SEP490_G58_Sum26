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

  const translateNotificationText = (text) => {
    if (!text) return '';

    return text
      .replaceAll('Thong bao', 'Thông báo')
      .replaceAll('Ban duoc phan cong vao hai trinh', 'Bạn được phân công vào hải trình')
      .replaceAll('Ban duoc phan cong len', 'Bạn được phân công lên')
      .replaceAll('hai trinh', 'hải trình')
      .replaceAll('Hai trinh da duoc cap nhat', 'Hải trình đã được cập nhật')
      .replaceAll('da cap nhat', 'đã cập nhật')
      .replaceAll('trang thai', 'trạng thái')
      .replaceAll('tinh trang thuyen vien', 'tình trạng thuyền viên')
      .replaceAll('tinh trang hang hoa', 'tình trạng hàng hóa')
      .replaceAll('ngay khoi hanh', 'ngày khởi hành')
      .replaceAll('ngay den', 'ngày đến')
      .replaceAll('ly do/phat sinh', 'lý do/phát sinh')
      .replaceAll('Diem danh tren tau da duoc cap nhat', 'Điểm danh trên tàu đã được cập nhật')
      .replaceAll('Trang thai diem danh cua ban', 'Trạng thái điểm danh của bạn')
      .replaceAll('co mat', 'có mặt')
      .replaceAll('vang mat', 'vắng mặt')
      .replaceAll('chua doc', 'chưa đọc');
  };

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button className="notification-bell-button" type="button" onClick={handleToggle} aria-label="Thông báo">
        <BellOutlined />
        {unreadCount > 0 && (
          <span className="notification-bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-header">
            <div>
              <h3>Thông báo</h3>
              <span>{unreadCount} chưa đọc</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={handleReadAll}>Đọc tất cả</button>
            )}
          </div>

          <div className="notification-bell-list">
            {loading && <div className="notification-bell-empty">Đang tải thông báo...</div>}
            {!loading && notifications.length === 0 && (
              <div className="notification-bell-empty">Chưa có thông báo nào</div>
            )}
            {!loading && notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-bell-item ${item.isRead ? '' : 'unread'}`}
                onClick={() => handleRead(item)}
              >
                <div className="notification-bell-item-top">
                  <span className="notification-bell-title">{translateNotificationText(item.title)}</span>
                  <span className="notification-bell-time">{formatTime(item.createdAt)}</span>
                </div>
                <p>{translateNotificationText(item.message)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
