import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEye, FiTruck, FiDownload } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const VehicleList = () => {
  const { isAssetManager } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    vehicle_type: '',
    status: '',
    project_id: ''
  });

  const { data: vehicles, isLoading } = useQuery(
    ['vehicles', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/vehicles?${params.toString()}`);
      return response.data.vehicles;
    }
  );

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
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
      
      const response = await axios.get(`/reports/vehicles?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vehicles-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const columns = [
    { header: 'Registration', accessor: 'registration_number' },
    { header: 'Vehicle ID', accessor: 'vehicle_id' },
    { header: 'Make & Model', accessor: 'make', render: (value, row) => `${row.make} ${row.model}` },
    { header: 'Type', accessor: 'vehicle_type' },
    { header: 'Status', accessor: 'status', render: (value) => (
      <span className={`badge ${value === 'Active' ? 'badge-success' : value === 'Maintenance' ? 'badge-warning' : 'badge-secondary'}`}>
        {value}
      </span>
    )},
    { header: 'Location', accessor: 'location_name' },
    { header: 'Assigned To', accessor: 'assigned_to_name' },
    { header: 'Mileage/Hours', accessor: 'current_mileage', render: (value, row) => {
      if (row.vehicle_type === 'Generator') {
        return `${row.current_hours || 0} hrs`;
      }
      return `${value || 0} km`;
    }}
  ];

  const actions = (row) => (
    <button
      className="btn-icon"
      onClick={() => navigate(`/vehicles/${row.id}`)}
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
            <FiTruck style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Vehicles & Equipment
          </h3>
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
          <div className="form-row">
            <FormInput
              label="Vehicle Type"
              name="vehicle_type"
              type="select"
              value={filters.vehicle_type}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Types' },
                { value: 'Car', label: 'Car' },
                { value: 'Truck', label: 'Truck' },
                { value: 'Motorbike', label: 'Motorbike' },
                { value: 'Generator', label: 'Generator' },
                { value: 'Other', label: 'Other' }
              ]}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={filters.status}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Retired', label: 'Retired' },
                { value: 'Disposed', label: 'Disposed' }
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
          </div>
        </div>

        <DataTable
          columns={columns}
          data={vehicles || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
          actions={actions}
          emptyMessage="No vehicles found"
        />
      </div>
    </div>
  );
};

export default VehicleList;

