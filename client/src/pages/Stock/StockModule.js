import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import StockList from './StockList';
import StockItemDetail from './StockItemDetail';
import StockEntry from './StockEntry';
import StockExit from './StockExit';
import StockValuation from './StockValuation';

const StockModule = () => {
  const location = useLocation();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Management</h1>
        <p className="page-subtitle">Manage inventory and stock movements</p>
      </div>

      <div className="module-tabs">
        <Link
          to="/stock"
          className={location.pathname === '/stock' ? 'active' : ''}
        >
          Stock Items
        </Link>
        <Link
          to="/stock/entry"
          className={location.pathname === '/stock/entry' ? 'active' : ''}
        >
          Stock Entry
        </Link>
        <Link
          to="/stock/exit"
          className={location.pathname === '/stock/exit' ? 'active' : ''}
        >
          Stock Exit
        </Link>
        <Link
          to="/stock/valuation"
          className={location.pathname === '/stock/valuation' ? 'active' : ''}
        >
          Valuation
        </Link>
      </div>

      <Routes>
        <Route index element={<StockList />} />
        <Route path="entry" element={<StockEntry />} />
        <Route path="exit" element={<StockExit />} />
        <Route path="valuation" element={<StockValuation />} />
        <Route path=":id" element={<StockItemDetail />} />
      </Routes>
    </div>
  );
};

export default StockModule;
