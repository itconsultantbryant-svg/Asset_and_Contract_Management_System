import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiHome, 
  FiSettings, 
  FiPackage, 
  FiBox, 
  FiTruck, 
  FiFileText,
  FiLogOut,
  FiUser,
  FiChevronDown,
  FiChevronRight,
  FiUsers,
  FiDatabase,
  FiList,
  FiPlus,
  FiFile,
  FiAlertCircle,
  FiBarChart2,
  FiShoppingCart,
  FiDroplet,
  FiTool,
  FiCheckCircle,
  FiClock,
  FiArchive,
  FiDownload
} from 'react-icons/fi';
import NotificationCenter from './NotificationCenter';
import './Layout.css';

const Layout = () => {
  const { user, logout, isAdmin, isAssetManager, isStockManager } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Role-based menu configuration
  const getMenuItems = () => {
    const items = [];

    // Dashboard - All users
    items.push({
      type: 'single',
      path: '/dashboard',
      label: 'Dashboard',
      icon: FiHome,
      description: 'Overview and statistics'
    });

    // Assets Module - Only Admin and Asset Manager
    if (isAdmin || isAssetManager) {
      items.push({
        type: 'group',
        key: 'assets',
        label: 'Asset Management',
        icon: FiPackage,
        items: [
          { path: '/assets', label: 'All Assets', icon: FiList, description: 'View all assets' },
          { path: '/assets/create', label: 'Create Asset', icon: FiPlus, description: 'Add new asset' },
        ]
      });
    }

    // Stock Module - Only Admin and Stock Manager
    if (isAdmin || isStockManager) {
      items.push({
        type: 'group',
        key: 'stock',
        label: 'Stock Management',
        icon: FiBox,
        items: [
          { path: '/stock', label: 'Stock Items', icon: FiList, description: 'View all stock items' },
          { path: '/stock/entry', label: 'Stock Entry', icon: FiPlus, description: 'Record stock entry' },
          { path: '/stock/exit', label: 'Stock Exit', icon: FiShoppingCart, description: 'Record stock exit' },
          { path: '/stock/valuation', label: 'Stock Valuation', icon: FiBarChart2, description: 'View stock valuation' },
        ]
      });
    }

    // Vehicles Module - Only Admin and Asset Manager
    if (isAdmin || isAssetManager) {
      items.push({
        type: 'group',
        key: 'vehicles',
        label: 'Vehicle & Fuel',
        icon: FiTruck,
        items: [
          { path: '/vehicles', label: 'All Vehicles', icon: FiList, description: 'View all vehicles' },
          { path: '/vehicles/create', label: 'Add Vehicle', icon: FiPlus, description: 'Register new vehicle' },
          { path: '/vehicles/fuel', label: 'Fuel Logs', icon: FiDroplet, description: 'View fuel consumption' },
          { path: '/vehicles/maintenance', label: 'Maintenance', icon: FiTool, description: 'Maintenance schedule' },
        ]
      });
    }

    // Contracts Module - Admin and Asset Manager only (Asset Managers can view contracts related to assets)
    if (isAdmin || isAssetManager) {
      items.push({
        type: 'group',
        key: 'contracts',
        label: 'Contract Management',
        icon: FiFileText,
        items: [
          { path: '/contracts', label: 'All Contracts', icon: FiList, description: 'View all contracts' },
          ...(isAdmin ? [
            { path: '/contracts/create', label: 'Create Contract', icon: FiPlus, description: 'Add new contract' },
          ] : []),
          { path: '/contracts/alerts', label: 'Expiration Alerts', icon: FiAlertCircle, description: 'Contracts expiring soon' },
        ]
      });
    }

    // Documents/Archived Module - All authenticated users (but filtered by role)
    items.push({
      type: 'single',
      path: '/documents',
      label: 'Documents & Archive',
      icon: FiArchive,
      description: 'View and manage documents'
    });

    // Reports Module - All authenticated users (but filtered by role)
    items.push({
      type: 'single',
      path: '/reports',
      label: 'Reports',
      icon: FiBarChart2,
      description: 'Generate and export reports'
    });

    // Administration Module - Admin only
    if (isAdmin) {
      items.push({
        type: 'group',
        key: 'admin',
        label: 'Administration',
        icon: FiSettings,
        items: [
          { path: '/admin/users', label: 'User Management', icon: FiUsers, description: 'Manage system users' },
          { path: '/admin/master-data', label: 'Master Data', icon: FiDatabase, description: 'Configure master data' },
        ]
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (groupItems) => {
    return groupItems.some(item => isActive(item.path));
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <img 
              src="/plan_international_liberia_logo.jpeg" 
              alt="Plan International Liberia" 
              className="navbar-logo"
            />
            <span>ACMS - Plan International Liberia</span>
          </div>
          <div className="navbar-user">
            <NotificationCenter />
            <div className="user-info">
              <FiUser style={{ marginRight: '5px' }} />
              <div className="user-details">
                <span className="user-name">{user?.full_name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={logout} className="btn btn-secondary logout-btn">
              <FiLogOut style={{ marginRight: '5px' }} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="layout-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Navigation</h3>
          </div>
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              if (item.type === 'single') {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`sidebar-menu-item ${active ? 'active' : ''}`}
                      title={item.description}
                    >
                      <Icon className="sidebar-menu-icon" />
                      <div className="menu-item-content">
                        <span className="menu-item-label">{item.label}</span>
                        {item.description && (
                          <span className="menu-item-description">{item.description}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              } else if (item.type === 'group') {
                const Icon = item.icon;
                const isExpanded = expandedMenus[item.key];
                const groupActive = isGroupActive(item.items);
                const shouldExpand = isExpanded !== undefined ? isExpanded : groupActive;

                return (
                  <li key={item.key} className="menu-group">
                    <div
                      className={`sidebar-menu-group ${groupActive ? 'active' : ''}`}
                      onClick={() => toggleMenu(item.key)}
                    >
                      <Icon className="sidebar-menu-icon" />
                      <div className="menu-item-content">
                        <span className="menu-item-label">{item.label}</span>
                      </div>
                      {shouldExpand ? (
                        <FiChevronDown className="menu-chevron" />
                      ) : (
                        <FiChevronRight className="menu-chevron" />
                      )}
                    </div>
                    {shouldExpand && (
                      <ul className="submenu">
                        {item.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive = isActive(subItem.path);
                          return (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                className={`sidebar-menu-item submenu-item ${subActive ? 'active' : ''}`}
                                title={subItem.description}
                              >
                                <SubIcon className="sidebar-menu-icon" />
                                <div className="menu-item-content">
                                  <span className="menu-item-label">{subItem.label}</span>
                                  {subItem.description && (
                                    <span className="menu-item-description">{subItem.description}</span>
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

