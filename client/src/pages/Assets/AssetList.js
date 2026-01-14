import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEye, FiPackage } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const AssetList = () => {
  const { isAssetManager } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    status_id: '',
    project_id: '',
    location_id: ''
  });

  const { data: assets, isLoading } = useQuery(
    ['assets', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/assets?${params.toString()}`);
      return response.data.assets;
    }
  );

  const { data: categories } = useQuery('asset-categories', async () => {
    const response = await axios.get('/admin/asset-categories');
    return response.data.categories;
  });

  const { data: statuses } = useQuery('asset-statuses', async () => {
    // This would need to be added to the backend
    return [];
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const { data: locations } = useQuery('locations', async () => {
    const response = await axios.get('/admin/locations');
    return response.data.locations;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const columns = [
    { header: 'Asset ID', accessor: 'asset_id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Category', accessor: 'category_name' },
    { header: 'Status', accessor: 'status_name' },
    { header: 'Location', accessor: 'location_name' },
    { header: 'Assigned To', accessor: 'assigned_to_name' },
    { 
      header: 'Current Value', 
      accessor: 'current_value',
      render: (value) => value ? `$${parseFloat(value).toFixed(2)}` : 'N/A'
    }
  ];

  const actions = (row) => (
    <button
      className="btn-icon"
      onClick={() => navigate(`/assets/${row.id}`)}
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
            <FiPackage style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Assets
          </h3>
        </div>

        <div className="filters-section" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px' }}>
          <div className="form-row">
            <FormInput
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, ID, or serial number"
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
          </div>
        </div>

        <DataTable
          columns={columns}
          data={assets || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/assets/${row.id}`)}
          actions={actions}
          emptyMessage="No assets found"
        />
      </div>
    </div>
  );
};

export default AssetList;

