import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEye, FiBox, FiDownload } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const StockList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    location_id: ''
  });

  const { data: items, isLoading } = useQuery(
    ['stock-items', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/stock/items?${params.toString()}`);
      return response.data.items;
    }
  );

  const { data: categories } = useQuery('stock-categories', async () => {
    // This endpoint would need to be added
    return [];
  });

  const { data: locations } = useQuery('locations', async () => {
    const response = await axios.get('/admin/locations');
    return response.data.locations;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append('format', format);
      
      const response = await axios.get(`/reports/stock?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stock-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const columns = [
    { header: 'Item Name', accessor: 'name' },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Unit', accessor: 'unit' },
    { 
      header: 'Quantity', 
      accessor: 'current_quantity',
      render: (value, row) => `${value || 0} ${row.unit}`
    },
    { 
      header: 'Unit Cost', 
      accessor: 'unit_cost',
      render: (value) => value ? `$${parseFloat(value).toFixed(2)}` : 'N/A'
    },
    { 
      header: 'Total Value', 
      accessor: 'current_quantity',
      render: (value, row) => {
        const total = (value || 0) * (row.unit_cost || 0);
        return `$${total.toFixed(2)}`;
      }
    },
    { header: 'Location', accessor: 'location_name' }
  ];

  const actions = (row) => (
    <button
      className="btn-icon"
      onClick={() => navigate(`/stock/${row.id}`)}
      title="View Details"
    >
      <FiEye />
    </button>
  );

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>
            <FiBox style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Stock Items
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => handleExport('excel')}>
              <FiDownload style={{ marginRight: '5px' }} />
              Export Excel
            </button>
          </div>
        </div>

        <div className="filters-section">
          <div className="form-row">
            <FormInput
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search items"
            />
            <FormInput
              label="Category"
              name="category_id"
              type="select"
              value={filters.category_id}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Categories' },
                ...(categories || []).map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            <FormInput
              label="Location"
              name="location_id"
              type="select"
              value={filters.location_id}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Locations' },
                ...(locations || []).map(loc => ({ value: loc.id, label: loc.name }))
              ]}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/stock/${row.id}`)}
          actions={actions}
          emptyMessage="No stock items found"
        />
      </div>
    </div>
  );
};

export default StockList;

