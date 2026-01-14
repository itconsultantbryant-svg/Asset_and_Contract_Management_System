import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import DataTable from '../../components/DataTable';

const ContractAlerts = () => {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery('contract-expiration-alerts', async () => {
    const response = await axios.get('/contracts/alerts/expiration?days=90');
    return response.data.alerts;
  });

  if (isLoading) return <div className="loading">Loading expiration alerts...</div>;
  if (error) return <div className="error">Failed to load alerts</div>;

  const alerts = data || [];

  const columns = [
    { header: 'Contract Number', accessor: 'contract_number' },
    { header: 'Title', accessor: 'title' },
    { header: 'Vendor', accessor: 'vendor_name' },
    { header: 'Project', accessor: 'project_name' },
    { header: 'End Date', accessor: 'end_date', render: (value) => new Date(value).toLocaleDateString() },
    { 
      header: 'Days Remaining', 
      accessor: 'days_remaining',
      render: (value) => {
        const days = Math.round(value);
        if (days <= 30) {
          return <span className="badge badge-danger">{days} days</span>;
        } else if (days <= 60) {
          return <span className="badge badge-warning">{days} days</span>;
        }
        return <span className="badge badge-info">{days} days</span>;
      }
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiAlertTriangle style={{ marginRight: '8px', color: '#ffc107' }} />
          Contract Expiration Alerts
        </h1>
        <p className="page-subtitle">Contracts expiring in the next 90 days</p>
      </div>

      {alerts.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3>
              <FiClock style={{ marginRight: '8px' }} />
              {alerts.length} Contract{alerts.length !== 1 ? 's' : ''} Expiring Soon
            </h3>
          </div>
          <DataTable
            columns={columns}
            data={alerts}
            onRowClick={(row) => navigate(`/contracts/${row.id}`)}
            emptyMessage="No contracts expiring in the next 90 days"
          />
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <FiClock size={48} style={{ color: '#95a5a6', marginBottom: '15px' }} />
            <p>No contracts expiring in the next 90 days</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractAlerts;

