import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ContractList from './ContractList';
import ContractDetail from './ContractDetail';
import ContractCreate from './ContractCreate';
import ContractAlerts from './ContractAlerts';

const ContractModule = () => {
  const location = useLocation();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contract Management</h1>
        <p className="page-subtitle">Manage contracts, MOUs, and SLAs</p>
      </div>

      <div className="module-tabs">
        <Link
          to="/contracts"
          className={location.pathname === '/contracts' || (location.pathname.startsWith('/contracts/') && !location.pathname.includes('/create')) ? 'active' : ''}
        >
          All Contracts
        </Link>
        <Link
          to="/contracts/create"
          className={location.pathname === '/contracts/create' ? 'active' : ''}
        >
          Create Contract
        </Link>
        <Link
          to="/contracts/alerts"
          className={location.pathname === '/contracts/alerts' ? 'active' : ''}
        >
          Expiration Alerts
        </Link>
      </div>

      <Routes>
        <Route index element={<ContractList />} />
        <Route path="create" element={<ContractCreate />} />
        <Route path="alerts" element={<ContractAlerts />} />
        <Route path=":id" element={<ContractDetail />} />
      </Routes>
    </div>
  );
};

export default ContractModule;
