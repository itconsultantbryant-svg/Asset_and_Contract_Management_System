import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery(
    'notifications',
    async () => {
      const response = await axios.get('/notifications?limit=20');
      return response.data.notifications;
    },
    {
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  const markAsReadMutation = useMutation(
    (id) => axios.put(`/notifications/${id}/read`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('notifications');
      }
    }
  );

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleMarkAsRead = (id, e) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Navigate based on entity type
    if (notification.entity_type === 'CONTRACT' && notification.entity_id) {
      window.location.href = `/contracts/${notification.entity_id}`;
    } else if (notification.entity_type === 'ASSET' && notification.entity_id) {
      window.location.href = `/assets/${notification.entity_id}`;
    } else if (notification.entity_type === 'VEHICLE_MAINTENANCE' && notification.entity_id) {
      // Could navigate to vehicle detail
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              <button className="notification-close" onClick={() => setIsOpen(false)}>
                <FiX />
              </button>
            </div>

            <div className="notification-list">
              {isLoading ? (
                <div className="notification-loading">Loading notifications...</div>
              ) : notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        className="notification-mark-read"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        title="Mark as read"
                      >
                        <FiCheck />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="notification-empty">No notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

