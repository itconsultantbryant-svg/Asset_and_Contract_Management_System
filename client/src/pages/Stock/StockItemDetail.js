import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';
import DataTable from '../../components/DataTable';

const StockItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['stock-item', id],
    async () => {
      const response = await axios.get(`/stock/items/${id}`);
      return response.data;
    }
  );

  if (isLoading) return <div className="loading">Loading stock item...</div>;
  if (error) return <div className="error">Failed to load stock item</div>;

  const item = data?.item;
  const movements = data?.movements || [];

  const movementColumns = [
    { header: 'Date', accessor: 'movement_date', render: (value) => new Date(value).toLocaleDateString() },
    { header: 'Type', accessor: 'movement_type' },
    { header: 'Quantity', accessor: 'quantity', render: (value, row) => `${value} ${item?.unit}` },
    { header: 'Reason', accessor: 'reason_name' },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Performed By', accessor: 'performed_by_name' }
  ];

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/stock')} style={{ marginBottom: '20px' }}>
        <FiArrowLeft style={{ marginRight: '5px' }} />
        Back to Stock
      </button>

      <div className="card">
        <div className="page-header">
          <h2>{item?.name}</h2>
        </div>

        <div className="detail-grid">
          <div className="detail-section">
            <h3>Basic Information</h3>
            <div className="detail-item">
              <strong>Category:</strong> {item?.category_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Unit:</strong> {item?.unit}
            </div>
            <div className="detail-item">
              <strong>Location:</strong> {item?.location_name || 'N/A'}
            </div>
            {item?.description && (
              <div className="detail-item">
                <strong>Description:</strong> {item.description}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Stock Information</h3>
            <div className="detail-item">
              <strong>Current Quantity:</strong> {item?.current_quantity || 0} {item?.unit}
            </div>
            <div className="detail-item">
              <strong>Unit Cost:</strong> {item?.unit_cost ? `$${parseFloat(item.unit_cost).toFixed(2)}` : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Total Value:</strong> {
                item?.current_quantity && item?.unit_cost
                  ? `$${((item.current_quantity || 0) * (item.unit_cost || 0)).toFixed(2)}`
                  : 'N/A'
              }
            </div>
            <div className="detail-item">
              <strong>Reorder Level:</strong> {item?.reorder_level || 0} {item?.unit}
            </div>
          </div>
        </div>

        {movements.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Movement History</h3>
            <DataTable
              columns={movementColumns}
              data={movements}
              emptyMessage="No movements recorded"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StockItemDetail;

