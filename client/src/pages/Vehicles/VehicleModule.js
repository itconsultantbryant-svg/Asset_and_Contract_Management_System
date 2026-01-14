import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import VehicleList from './VehicleList';
import VehicleDetail from './VehicleDetail';
import VehicleCreate from './VehicleCreate';
import FuelLog from './FuelLog';
import MaintenanceSchedule from './MaintenanceSchedule';

const VehicleModule = () => {
  const location = useLocation();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vehicle & Fuel Management</h1>
        <p className="page-subtitle">Manage vehicles, fuel logs, and maintenance</p>
      </div>

      <div className="module-tabs">
        <Link
          to="/vehicles"
          className={location.pathname === '/vehicles' || location.pathname.startsWith('/vehicles/') && !location.pathname.includes('/create') && !location.pathname.includes('/fuel') && !location.pathname.includes('/maintenance') ? 'active' : ''}
        >
          Vehicles
        </Link>
        <Link
          to="/vehicles/create"
          className={location.pathname === '/vehicles/create' ? 'active' : ''}
        >
          Add Vehicle
        </Link>
        <Link
          to="/vehicles/fuel"
          className={location.pathname === '/vehicles/fuel' ? 'active' : ''}
        >
          Fuel Log
        </Link>
        <Link
          to="/vehicles/maintenance"
          className={location.pathname === '/vehicles/maintenance' ? 'active' : ''}
        >
          Maintenance
        </Link>
      </div>

      <Routes>
        <Route index element={<VehicleList />} />
        <Route path="create" element={<VehicleCreate />} />
        <Route path="fuel" element={<FuelLog />} />
        <Route path="maintenance" element={<MaintenanceSchedule />} />
        <Route path=":id" element={<VehicleDetail />} />
      </Routes>
    </div>
  );
};

export default VehicleModule;
