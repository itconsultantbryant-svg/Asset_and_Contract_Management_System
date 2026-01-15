import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiEye, FiFileText, FiDownload } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const ContractList = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    contract_type: '',
    project_id: ''
  });

  const { data: contracts, isLoading } = useQuery(
    ['contracts', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/contracts?${params.toString()}`);
      return response.data.contracts;
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
      
      const response = await axios.get(`/reports/contracts?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contracts-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Active': 'badge-success',
      'Draft': 'badge-secondary',
      'Review': 'badge-info',
      'Approval': 'badge-warning',
      'Execution': 'badge-info',
      'Expired': 'badge-danger',
      'Renewed': 'badge-success',
      'Terminated': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const columns = [
    { header: 'Contract Number', accessor: 'contract_number' },
    { header: 'Title', accessor: 'title' },
    { header: 'Type', accessor: 'contract_type' },
    { header: 'Vendor', accessor: 'vendor_name' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <span className={`badge ${getStatusBadge(value)}`}>
          {value}
        </span>
      )
    },
    { header: 'Start Date', accessor: 'start_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { header: 'End Date', accessor: 'end_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { 
      header: 'Value', 
      accessor: 'value',
      render: (value, row) => value ? `${row.currency || 'USD'} ${parseFloat(value).toLocaleString()}` : 'N/A'
    }
  ];

  const actions = (row) => (
    <button
      className="btn-icon"
      onClick={() => navigate(`/contracts/${row.id}`)}
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
            <FiFileText style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Contracts
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
              placeholder="Search by title or contract number"
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={filters.status}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Review', label: 'Review' },
                { value: 'Approval', label: 'Approval' },
                { value: 'Execution', label: 'Execution' },
                { value: 'Active', label: 'Active' },
                { value: 'Expired', label: 'Expired' },
                { value: 'Renewed', label: 'Renewed' },
                { value: 'Terminated', label: 'Terminated' }
              ]}
            />
            <FormInput
              label="Type"
              name="contract_type"
              type="select"
              value={filters.contract_type}
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'All Types' },
                { value: 'MOU', label: 'MOU' },
                { value: 'SLA', label: 'SLA' },
                { value: 'Service', label: 'Service' },
                { value: 'Supply', label: 'Supply' },
                { value: 'Consultancy', label: 'Consultancy' },
                { value: 'Other', label: 'Other' }
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
          data={contracts || []}
          loading={isLoading}
          onRowClick={(row) => navigate(`/contracts/${row.id}`)}
          actions={actions}
          emptyMessage="No contracts found"
        />
      </div>
    </div>
  );
};

export default ContractList;

