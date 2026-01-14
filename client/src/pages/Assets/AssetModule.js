import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import AssetList from './AssetList';
import AssetDetail from './AssetDetail';
import AssetCreate from './AssetCreate';

const AssetModule = () => {
  const location = useLocation();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Asset Management</h1>
        <p className="page-subtitle">Manage assets, transfers, and maintenance</p>
      </div>

      <div className="module-tabs">
        <Link
          to="/assets"
          className={location.pathname === '/assets' ? 'active' : ''}
        >
          All Assets
        </Link>
        <Link
          to="/assets/create"
          className={location.pathname === '/assets/create' ? 'active' : ''}
        >
          Create Asset
        </Link>
      </div>

      <Routes>
        <Route index element={<AssetList />} />
        <Route path="create" element={<AssetCreate />} />
        <Route path=":id" element={<AssetDetail />} />
      </Routes>
    </div>
  );
};

export default AssetModule;
