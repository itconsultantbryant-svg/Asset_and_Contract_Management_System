import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiDownload } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const ContractReport = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    project_id: '',
    from_date: '',
    to_date: ''
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const { data, isLoading } = useQuery(
    ['contract-report', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await axios.get(`/reports/contracts?${params.toString()}`);
      return response.data.contracts || [];
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

  const columns = [
    { 
      header: 'Start Date', 
      accessor: 'start_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { 
      header: 'End Date', 
      accessor: 'end_date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    { header: 'Contract Title', accessor: 'title' },
    { header: 'Type', accessor: 'contract_type' },
    { header: 'Vendor/Supplier', accessor: 'vendor_name' },
    { header: 'Project', accessor: 'project_name' },
    { 
      header: 'Contract Value', 
      accessor: 'value',
      render: (value, row) => `${row.currency || 'USD'} ${value ? parseFloat(value).toFixed(2) : '0.00'}`
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <span className={`badge ${value === 'Active' ? 'badge-success' : value === 'Expired' ? 'badge-danger' : 'badge-secondary'}`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="card">
      <div className="page-header">
        <h2>Contract Report</h2>
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
            placeholder="Search by title, vendor..."
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
              { value: 'Draft', label: 'Draft' },
              { value: 'Expired', label: 'Expired' },
              { value: 'Terminated', label: 'Terminated' }
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

export default ContractReport;

