import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiArchive, FiDownload, FiEye, FiFile, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import DataTable from '../../components/DataTable';
import { Link } from 'react-router-dom';

const DocumentList = () => {
  const [filters, setFilters] = useState({
    document_code: '',
    file_name: '',
    project_id: '',
    category: '',
    from_date: '',
    to_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const { data, isLoading, refetch } = useQuery(
    ['documents', filters],
    async () => {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      const response = await axios.get(`/documents?${params.toString()}`);
      return response.data.documents;
    }
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      document_code: '',
      file_name: '',
      project_id: '',
      category: '',
      from_date: '',
      to_date: ''
    });
  };

  const handleDownload = async (document) => {
    try {
      const response = await axios.get(`/documents/${document.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.original_file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const handleView = (document) => {
    window.open(`/api/documents/${document.id}/view`, '_blank');
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append('format', format);
      
      const response = await axios.get(`/reports/documents?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documents-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const columns = [
    {
      header: 'Document Code',
      accessor: 'document_code',
      render: (row) => <strong>{row.document_code}</strong>
    },
    {
      header: 'File Name',
      accessor: 'file_name'
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => row.category || '-'
    },
    {
      header: 'Project',
      accessor: 'project_name',
      render: (row) => row.project_name || '-'
    },
    {
      header: 'Entity',
      accessor: 'entity_type',
      render: (row) => row.entity_type ? `${row.entity_type} #${row.entity_id}` : '-'
    },
    {
      header: 'Uploaded By',
      accessor: 'uploaded_by_name'
    },
    {
      header: 'Upload Date',
      accessor: 'uploaded_at',
      render: (row) => new Date(row.uploaded_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="btn-icon"
            onClick={() => handleView(row)}
            title="View"
          >
            <FiEye />
          </button>
          <button
            className="btn-icon"
            onClick={() => handleDownload(row)}
            title="Download"
          >
            <FiDownload />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="card">
      <div className="page-header">
        <div>
          <h2>
            <FiArchive style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Documents & Archive
          </h2>
          <p className="page-subtitle">View and manage all system documents</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('excel')}>
            <FiDownload style={{ marginRight: '5px' }} />
            Export Excel
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
            <FiDownload style={{ marginRight: '5px' }} />
            Export PDF
          </button>
          <Link to="/documents/create" className="btn btn-primary">
            <FiFile style={{ marginRight: '5px' }} />
            Upload Document
          </Link>
        </div>
      </div>

      <div className="filters-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter style={{ marginRight: '5px' }} />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          {(filters.document_code || filters.file_name || filters.project_id || filters.category || filters.from_date || filters.to_date) && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              <FiX style={{ marginRight: '5px' }} />
              Clear Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div className="form-group">
              <label>Document Code</label>
              <input
                type="text"
                name="document_code"
                value={filters.document_code}
                onChange={handleFilterChange}
                placeholder="Search by code"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>File Name</label>
              <input
                type="text"
                name="file_name"
                value={filters.file_name}
                onChange={handleFilterChange}
                placeholder="Search by file name"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Project</label>
              <select
                name="project_id"
                value={filters.project_id}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="">All Projects</option>
                {(projects || []).map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                placeholder="Search by category"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="loading">Loading documents...</div>
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

export default DocumentList;

