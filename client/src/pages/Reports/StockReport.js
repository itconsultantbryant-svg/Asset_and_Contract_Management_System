import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiDownload } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const StockReport = () => {
  const [filters, setFilters] = useState({
    search: '',
    stock_item_id: '',
    project_id: '',
    location_id: '',
    from_date: '',
    to_date: ''
  });

  const { data: stockItems } = useQuery('stock-items', async () => {
    const response = await axios.get('/stock/items');
    return response.data.items;
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const { data: locations } = useQuery('locations', async () => {
    const response = await axios.get('/admin/locations');
    return response.data.locations;
  });

  const { data, isLoading } = useQuery(
    ['stock-report', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/reports/stock?${params.toString()}`);
      return response.data.items || [];
    }
  );

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
    { header: 'Stock Name', accessor: 'stock_name' },
    { 
      header: 'Movement Date', 
      accessor: 'movement_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { 
      header: 'Available Qty', 
      accessor: 'available_qty',
      render: (value, row) => `${parseFloat(value).toFixed(2)} ${row.unit || ''}`
    },
    { 
      header: 'Unit Cost', 
      accessor: 'unit_cost',
      render: (value, row) => `${row.currency || 'USD'} ${value ? parseFloat(value).toFixed(2) : '0.00'}`
    },
    { 
      header: 'Value Cost', 
      accessor: 'value_cost',
      render: (value, row) => `${row.currency || 'USD'} ${parseFloat(value).toFixed(2)}`
    },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Reference No.', accessor: 'reference_number' },
    { header: 'Location', accessor: 'location_name' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <span className={`badge ${value === 'Available' ? 'badge-success' : 'badge-danger'}`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="card">
      <div className="page-header">
        <h2>Stock Report</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('excel')}>
            <FiDownload style={{ marginRight: '5px' }} />
            Export Excel
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
            <FiDownload style={{ marginRight: '5px' }} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <FormInput
            label="Search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search by name, reference..."
          />
          <FormInput
            label="Stock Name"
            name="stock_item_id"
            type="select"
            value={filters.stock_item_id}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Stock Items' },
              ...(stockItems || []).map(item => ({ value: item.id, label: item.name }))
            ]}
          />
          <FormInput
            label="Project"
            name="project_id"
            type="select"
            value={filters.project_id}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Projects' },
              ...(projects || []).map(proj => ({ value: proj.id, label: proj.name }))
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
          <FormInput
            label="From Date"
            name="from_date"
            type="date"
            value={filters.from_date}
            onChange={handleFilterChange}
          />
          <FormInput
            label="To Date"
            name="to_date"
            type="date"
            value={filters.to_date}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading report...</div>
      ) : (
        <DataTable
          data={data || []}
          columns={columns}
          searchable={false}
        />
      )}
    </div>
  );
};

export default StockReport;

