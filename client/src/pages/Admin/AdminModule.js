import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import MasterData from './MasterData';

const AdminModule = () => {
  const location = useLocation();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">Manage users and system configuration</p>
      </div>

      <div className="module-tabs">
        <Link
          to="/admin/users"
          className={location.pathname === '/admin/users' ? 'active' : ''}
        >
          User Management
        </Link>
        <Link
          to="/admin/master-data"
          className={location.pathname === '/admin/master-data' ? 'active' : ''}
        >
          Master Data
        </Link>
      </div>

      <Routes>
        <Route path="users" element={<UserManagement />} />
        <Route path="master-data" element={<MasterData />} />
        <Route index element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </div>
  );
};

export default AdminModule;

