import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiTool, FiAlertTriangle } from 'react-icons/fi';
import DataTable from '../../components/DataTable';

const MaintenanceSchedule = () => {
  const { data: alerts, isLoading } = useQuery('maintenance-alerts', async () => {
    const response = await axios.get('/vehicles/maintenance/alerts?days=30');
    return response.data.alerts;
  });

  const columns = [
    { header: 'Vehicle', accessor: 'registration_number' },
    { header: 'Make & Model', accessor: 'make', render: (value, row) => `${row.make} ${row.model}` },
    { header: 'Maintenance Type', accessor: 'maintenance_type' },
    { header: 'Scheduled Date', accessor: 'scheduled_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { header: 'Next Service Date', accessor: 'next_service_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { header: 'Status', accessor: 'status', render: (value) => (
      <span className={`badge ${value === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
        {value}
      </span>
    )}
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <FiTool style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Maintenance Schedule
        </h1>
        <p className="page-subtitle">Upcoming maintenance and service alerts</p>
      </div>

      {alerts && alerts.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3>
              <FiAlertTriangle style={{ marginRight: '8px', color: '#ffc107' }} />
              Maintenance Due (Next 30 Days)
            </h3>
          </div>
          <DataTable
            columns={columns}
            data={alerts}
            loading={isLoading}
            emptyMessage="No maintenance due in the next 30 days"
          />
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <FiTool size={48} style={{ color: '#95a5a6', marginBottom: '15px' }} />
            <p>No maintenance alerts at this time</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;

