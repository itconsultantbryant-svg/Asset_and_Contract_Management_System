import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiPackage, 
  FiBox, 
  FiFileText, 
  FiTruck, 
  FiUsers,
  FiAlertCircle,
  FiTrendingUp,
  FiDollarSign,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiShoppingCart,
  FiArrowDown,
  FiArrowUp
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery('dashboard', async () => {
    const response = await axios.get('/dashboard/summary');
    return response.data;
  });

  if (isLoading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Failed to load dashboard</div>;

  const summary = data?.summary || {};
  const userRole = data?.userRole || user?.role;

  // Role-specific stats configuration
  const getStats = () => {
    if (userRole === 'Administrator') {
      return [
        {
          title: 'Total Assets',
          value: summary.assets?.total || 0,
          icon: FiPackage,
          color: '#3498db',
          subtitle: `Value: $${(summary.assets?.totalValue || 0).toLocaleString()} • ${summary.assets?.thisMonth || 0} this month`
        },
        {
          title: 'Stock Items',
          value: summary.stock?.totalItems || 0,
          icon: FiBox,
          color: '#2ecc71',
          subtitle: `Value: $${(summary.stock?.totalValue || 0).toLocaleString()}`
        },
        {
          title: 'Active Contracts',
          value: summary.contracts?.active || 0,
          icon: FiFileText,
          color: '#9b59b6',
          subtitle: `Value: $${(summary.contracts?.totalValue || 0).toLocaleString()} • ${summary.contracts?.pendingApprovals || 0} pending`
        },
        {
          title: 'Active Vehicles',
          value: summary.vehicles?.total || 0,
          icon: FiTruck,
          color: '#e67e22',
          subtitle: `${summary.vehicles?.maintenanceDue || 0} need maintenance`
        },
        {
          title: 'Total Users',
          value: summary.users?.total || 0,
          icon: FiUsers,
          color: '#16a085',
          subtitle: 'Active users'
        },
        {
          title: 'Unread Notifications',
          value: summary.notifications?.unread || 0,
          icon: FiAlertCircle,
          color: '#e74c3c',
          subtitle: 'Require attention'
        }
      ];
    } else if (userRole === 'Asset Manager') {
      return [
        {
          title: 'Total Assets',
          value: summary.assets?.total || 0,
          icon: FiPackage,
          color: '#3498db',
          subtitle: `${summary.assets?.myAssets || 0} assigned to me • Value: $${(summary.assets?.myAssetsValue || 0).toLocaleString()}`
        },
        {
          title: 'Active Vehicles',
          value: summary.vehicles?.total || 0,
          icon: FiTruck,
          color: '#e67e22',
          subtitle: `${summary.vehicles?.maintenanceDue || 0} need maintenance`
        },
        {
          title: 'Active Contracts',
          value: summary.contracts?.active || 0,
          icon: FiFileText,
          color: '#9b59b6',
          subtitle: `${summary.contracts?.expiringSoon || 0} expiring soon`
        },
        {
          title: 'Unread Notifications',
          value: summary.notifications?.unread || 0,
          icon: FiAlertCircle,
          color: '#e74c3c',
          subtitle: 'Require attention'
        }
      ];
    } else if (userRole === 'Stock Manager') {
      return [
        {
          title: 'Stock Items',
          value: summary.stock?.totalItems || 0,
          icon: FiBox,
          color: '#2ecc71',
          subtitle: `Value: $${(summary.stock?.totalValue || 0).toLocaleString()} • ${summary.stock?.movementsThisMonth?.count || 0} movements this month`
        },
        {
          title: 'Low Stock Items',
          value: summary.stock?.lowStockCount || 0,
          icon: FiAlertTriangle,
          color: '#e74c3c',
          subtitle: 'Need reordering'
        },
        {
          title: 'Stock Entries (30d)',
          value: summary.stock?.entries30Days?.count || 0,
          icon: FiArrowDown,
          color: '#27ae60',
          subtitle: `Value: $${(summary.stock?.entries30Days?.value || 0).toLocaleString()}`
        },
        {
          title: 'Stock Exits (30d)',
          value: summary.stock?.exits30Days?.count || 0,
          icon: FiArrowUp,
          color: '#e67e22',
          subtitle: `Value: $${(summary.stock?.exits30Days?.value || 0).toLocaleString()}`
        },
        {
          title: 'Unread Notifications',
          value: summary.notifications?.unread || 0,
          icon: FiAlertCircle,
          color: '#e74c3c',
          subtitle: 'Require attention'
        }
      ];
    }
    return [];
  };

  const stats = getStats();

  // Get alerts based on role
  const getAlerts = () => {
    const alerts = [];
    
    if (userRole === 'Administrator') {
      if (summary.contracts?.expiring30Days > 0) {
        alerts.push({
          type: 'danger',
          message: `${summary.contracts.expiring30Days} contracts expiring in 30 days`,
          icon: FiAlertCircle
        });
      }
      if (summary.contracts?.expiring60Days > 0) {
        alerts.push({
          type: 'warning',
          message: `${summary.contracts.expiring60Days} contracts expiring in 60 days`,
          icon: FiClock
        });
      }
      if (summary.contracts?.expiring90Days > 0) {
        alerts.push({
          type: 'info',
          message: `${summary.contracts.expiring90Days} contracts expiring in 90 days`,
          icon: FiClock
        });
      }
      if (summary.stock?.lowStockCount > 0) {
        alerts.push({
          type: 'warning',
          message: `${summary.stock.lowStockCount} stock items are low`,
          icon: FiAlertTriangle
        });
      }
      if (summary.vehicles?.maintenanceDue > 0) {
        alerts.push({
          type: 'info',
          message: `${summary.vehicles.maintenanceDue} vehicles need maintenance`,
          icon: FiTruck
        });
      }
    } else if (userRole === 'Asset Manager') {
      if (summary.contracts?.expiringSoon > 0) {
        alerts.push({
          type: 'warning',
          message: `${summary.contracts.expiringSoon} contracts expiring soon`,
          icon: FiFileText
        });
      }
      if (summary.vehicles?.maintenanceDue > 0) {
        alerts.push({
          type: 'info',
          message: `${summary.vehicles.maintenanceDue} vehicles need maintenance`,
          icon: FiTruck
        });
      }
      if (summary.assets?.pendingTransfers > 0) {
        alerts.push({
          type: 'info',
          message: `${summary.assets.pendingTransfers} asset transfers pending approval`,
          icon: FiClock
        });
      }
    } else if (userRole === 'Stock Manager') {
      if (summary.stock?.lowStockCount > 0) {
        alerts.push({
          type: 'danger',
          message: `${summary.stock.lowStockCount} stock items are low and need reordering`,
          icon: FiAlertTriangle
        });
      }
    }

    return alerts;
  };

  const alerts = getAlerts();

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, {user?.full_name}! Here's your comprehensive overview as {userRole}
        </p>
      </div>

      {/* Key Statistics */}
      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-card-header">
                <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}20` }}>
                  <Icon size={24} color={stat.color} />
                </div>
                <div className="stat-content">
                  <span className="stat-card-title">{stat.title}</span>
                  {stat.subtitle && <span className="stat-card-subtitle">{stat.subtitle}</span>}
                </div>
              </div>
              <div className="stat-card-value" style={{ color: stat.color }}>{stat.value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="dashboard-card alerts-section">
          <h3>
            <FiAlertCircle style={{ marginRight: '8px', color: '#e74c3c' }} />
            Important Alerts
          </h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => {
              const AlertIcon = alert.icon;
              return (
                <div key={index} className={`alert-item alert-${alert.type}`}>
                  <AlertIcon style={{ marginRight: '8px' }} />
                  <strong>{alert.message}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Administrator Dashboard */}
        {userRole === 'Administrator' && (
          <>
            <div className="dashboard-card">
              <h3>Assets by Status</h3>
              {summary.assets?.byStatus?.length > 0 ? (
                <ul className="status-list">
                  {summary.assets.byStatus.map((item, index) => (
                    <li key={index}>
                      <span>{item.status || 'Unknown'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No assets data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Assets by Category</h3>
              {summary.assets?.byCategory?.length > 0 ? (
                <ul className="status-list">
                  {summary.assets.byCategory.slice(0, 8).map((item, index) => (
                    <li key={index}>
                      <span>{item.category || 'Uncategorized'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No category data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Stock by Category</h3>
              {summary.stock?.byCategory?.length > 0 ? (
                <ul className="status-list">
                  {summary.stock.byCategory.slice(0, 8).map((item, index) => (
                    <li key={index}>
                      <div>
                        <span>{item.category || 'Uncategorized'}</span>
                        <span className="badge badge-info">{item.count} items</span>
                      </div>
                      <div className="value-text">${(item.total_value || 0).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No stock category data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Contracts by Status</h3>
              {summary.contracts?.byStatus?.length > 0 ? (
                <ul className="status-list">
                  {summary.contracts.byStatus.map((item, index) => (
                    <li key={index}>
                      <span>{item.status || 'Unknown'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No contract data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Vehicles by Type</h3>
              {summary.vehicles?.byType?.length > 0 ? (
                <ul className="status-list">
                  {summary.vehicles.byType.map((item, index) => (
                    <li key={index}>
                      <span>{item.type || 'Unknown'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No vehicle data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Users by Role</h3>
              {summary.users?.byRole?.length > 0 ? (
                <ul className="status-list">
                  {summary.users.byRole.map((item, index) => (
                    <li key={index}>
                      <span>{item.role || 'Unknown'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No user data available</p>
              )}
            </div>

            {summary.stock?.movementsThisMonth && (
              <div className="dashboard-card">
                <h3>Stock Movements This Month</h3>
                <div className="metric-display">
                  <div className="metric-item">
                    <span className="metric-label">Total Movements:</span>
                    <span className="metric-value">{summary.stock.movementsThisMonth.count || 0}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Entries Value:</span>
                    <span className="metric-value" style={{ color: '#27ae60' }}>
                      ${(summary.stock.movementsThisMonth.entriesValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Exits Value:</span>
                    <span className="metric-value" style={{ color: '#e67e22' }}>
                      ${(summary.stock.movementsThisMonth.exitsValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {summary.vehicles?.fuelConsumption30Days > 0 && (
              <div className="dashboard-card">
                <h3>Fuel Consumption (Last 30 Days)</h3>
                <div className="metric-display">
                  <div className="metric-item">
                    <span className="metric-label">Total Quantity:</span>
                    <span className="metric-value">{summary.vehicles.fuelConsumption30Days.toLocaleString()} L</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Total Cost:</span>
                    <span className="metric-value">${(summary.vehicles.fuelCost30Days || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Asset Manager Dashboard */}
        {userRole === 'Asset Manager' && (
          <>
            <div className="dashboard-card">
              <h3>Assets by Status</h3>
              {summary.assets?.byStatus?.length > 0 ? (
                <ul className="status-list">
                  {summary.assets.byStatus.map((item, index) => (
                    <li key={index}>
                      <span>{item.status || 'Unknown'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No assets data available</p>
              )}
            </div>

            <div className="dashboard-card">
              <h3>Assets by Category</h3>
              {summary.assets?.byCategory?.length > 0 ? (
                <ul className="status-list">
                  {summary.assets.byCategory.slice(0, 8).map((item, index) => (
                    <li key={index}>
                      <span>{item.category || 'Uncategorized'}</span>
                      <span className="badge badge-info">{item.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No category data available</p>
              )}
            </div>

            {summary.vehicles?.fuelConsumption30Days > 0 && (
              <div className="dashboard-card">
                <h3>Fuel Consumption (Last 30 Days)</h3>
                <div className="metric-display">
                  <div className="metric-item">
                    <span className="metric-label">Total Quantity:</span>
                    <span className="metric-value">{summary.vehicles.fuelConsumption30Days.toLocaleString()} L</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Total Cost:</span>
                    <span className="metric-value">${(summary.vehicles.fuelCost30Days || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stock Manager Dashboard */}
        {userRole === 'Stock Manager' && (
          <>
            <div className="dashboard-card">
              <h3>Stock by Category</h3>
              {summary.stock?.byCategory?.length > 0 ? (
                <ul className="status-list">
                  {summary.stock.byCategory.slice(0, 10).map((item, index) => (
                    <li key={index}>
                      <div>
                        <span>{item.category || 'Uncategorized'}</span>
                        <span className="badge badge-info">{item.count} items</span>
                      </div>
                      <div className="value-text">${(item.total_value || 0).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No stock category data available</p>
              )}
            </div>

            {summary.stock?.movementsThisMonth && (
              <div className="dashboard-card">
                <h3>Stock Movements This Month</h3>
                <div className="metric-display">
                  <div className="metric-item">
                    <span className="metric-label">Total Movements:</span>
                    <span className="metric-value">{summary.stock.movementsThisMonth.count || 0}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Entries Value:</span>
                    <span className="metric-value" style={{ color: '#27ae60' }}>
                      ${(summary.stock.movementsThisMonth.entriesValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Exits Value:</span>
                    <span className="metric-value" style={{ color: '#e67e22' }}>
                      ${(summary.stock.movementsThisMonth.exitsValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {summary.stock?.recentMovements?.length > 0 && (
              <div className="dashboard-card">
                <h3>Recent Stock Movements</h3>
                <div className="movements-list">
                  {summary.stock.recentMovements.slice(0, 10).map((movement, index) => (
                    <div key={index} className="movement-item">
                      <div className="movement-header">
                        <strong>{movement.item_name}</strong>
                        <span className={`badge badge-${movement.movement_type === 'Entry' ? 'success' : 'warning'}`}>
                          {movement.movement_type}
                        </span>
                      </div>
                      <div className="movement-details">
                        <span>Quantity: {movement.quantity}</span>
                        <span>Reason: {movement.reason_name || 'N/A'}</span>
                        <span>{new Date(movement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Activities */}
      {summary.recentActivities?.length > 0 && (
        <div className="dashboard-card">
          <h3>
            <FiActivity style={{ marginRight: '8px' }} />
            Recent Activities
          </h3>
          <div className="activities-list">
            {summary.recentActivities.slice(0, 15).map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-action">
                  <strong>{activity.action}</strong> on <strong>{activity.entity}</strong>
                  {activity.entity_id && <span className="entity-id">(ID: {activity.entity_id})</span>}
                </div>
                <div className="activity-meta">
                  by {activity.full_name || activity.username} • {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

