import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiDollarSign } from 'react-icons/fi';
import DataTable from '../../components/DataTable';

const StockValuation = () => {
  const { data, isLoading, error } = useQuery('stock-valuation', async () => {
    const response = await axios.get('/stock/valuation');
    return response.data;
  });

  if (isLoading) return <div className="loading">Loading valuation...</div>;
  if (error) return <div className="error">Failed to load valuation</div>;

  const items = data?.items || [];
  const summary = data?.summary || {};

  const columns = [
    { header: 'Item Name', accessor: 'name' },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Quantity', accessor: 'current_quantity' },
    { 
      header: 'Unit Cost', 
      accessor: 'unit_cost',
      render: (value) => value ? `$${parseFloat(value).toFixed(2)}` : 'N/A'
    },
    { 
      header: 'Total Value', 
      accessor: 'total_value',
      render: (value) => `$${parseFloat(value || 0).toFixed(2)}`
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Valuation</h1>
        <p className="page-subtitle">Current inventory value and summary</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <FiDollarSign size={24} color="#2ecc71" />
            <span className="stat-card-title">Total Value</span>
          </div>
          <div className="stat-card-value">
            ${parseFloat(summary.totalValue || 0).toFixed(2)}
          </div>
          <div className="stat-card-change">
            {summary.currency || 'USD'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Items</span>
          </div>
          <div className="stat-card-value">
            {summary.totalItems || 0}
          </div>
          <div className="stat-card-change">
            Items in stock
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Valuation by Item</h3>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyMessage="No stock items found"
        />
      </div>
    </div>
  );
};

export default StockValuation;

