import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminModule from './pages/Admin/AdminModule';
import AssetModule from './pages/Assets/AssetModule';
import StockModule from './pages/Stock/StockModule';
import VehicleModule from './pages/Vehicles/VehicleModule';
import ContractModule from './pages/Contracts/ContractModule';
import Layout from './components/Layout';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Only Route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'Administrator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="admin/*"
          element={
            <AdminRoute>
              <AdminModule />
            </AdminRoute>
          }
        />
        <Route path="assets/*" element={<AssetModule />} />
        <Route path="stock/*" element={<StockModule />} />
        <Route path="vehicles/*" element={<VehicleModule />} />
        <Route path="contracts/*" element={<ContractModule />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

