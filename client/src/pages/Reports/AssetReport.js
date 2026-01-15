import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiDownload, FiSearch, FiFilter } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const AssetReport = () => {
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    project_id: '',
    location_id: '',
    from_date: '',
    to_date: ''
  });
  const [showFilters, setShowFilters] = useState(true);

  const { data: categories } = useQuery('asset-categories', async () => {
    const response = await axios.get('/admin/asset-categories');
    return response.data.categories;
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
    ['asset-report', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/reports/assets?${params.toString()}`);
      return response.data.assets || [];
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
      
      const response = await axios.get(`/reports/assets?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assets-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Asset Name', accessor: 'name' },
    { header: 'Category', accessor: 'category_name' },
    { 
      header: 'Acquisition Value', 
      accessor: 'acquisition_value',
      render: (value, row) => `${row.currency || 'USD'} ${parseFloat(value).toFixed(2)}`
    },
    { 
      header: 'Depreciation (%)', 
      accessor: 'depreciation_value_percent',
      render: (value) => `${parseFloat(value).toFixed(2)}%`
    },
    { 
      header: 'Total Depreciation', 
      accessor: 'total_depreciation',
      render: (value, row) => `${row.currency || 'USD'} ${parseFloat(value).toFixed(2)}`
    },
    { 
      header: 'Net Book Value', 
      accessor: 'net_book_value',
      render: (value, row) => `${row.currency || 'USD'} ${parseFloat(value).toFixed(2)}`
    },
    { header: 'Status', accessor: 'calculated_status' },
    { header: 'Location', accessor: 'location_name' },
    { header: 'Project', accessor: 'project_name' }
  ];

  return (
    <div className="card">
      <div className="page-header">
        <h2>Asset Report</h2>
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

      {showFilters && (
        <div className="filters-section">
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <FormInput
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by code, name..."
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
      )}

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

export default AssetReport;

