import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['asset', id],
    async () => {
      const response = await axios.get(`/assets/${id}`);
      return response.data;
    }
  );

  if (isLoading) return <div className="loading">Loading asset details...</div>;
  if (error) return <div className="error">Failed to load asset details</div>;

  const asset = data?.asset;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/assets')} style={{ marginBottom: '20px' }}>
        <FiArrowLeft style={{ marginRight: '5px' }} />
        Back to Assets
      </button>

      <div className="card">
        <div className="page-header">
          <h2>{asset?.name} ({asset?.asset_id})</h2>
        </div>

        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div className="detail-section">
            <h3>Basic Information</h3>
            <div className="detail-item">
              <strong>Asset ID:</strong> {asset?.asset_id}
            </div>
            <div className="detail-item">
              <strong>Category:</strong> {asset?.category_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Status:</strong> {asset?.status_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Serial Number:</strong> {asset?.serial_number || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Model:</strong> {asset?.model || 'N/A'}
            </div>
          </div>

          <div className="detail-section">
            <h3>Financial Information</h3>
            <div className="detail-item">
              <strong>Purchase Price:</strong> {asset?.purchase_price ? `${asset.currency || 'USD'} ${parseFloat(asset.purchase_price).toFixed(2)}` : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Current Value:</strong> {asset?.current_value ? `${asset.currency || 'USD'} ${parseFloat(asset.current_value).toFixed(2)}` : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Depreciation Rate:</strong> {asset?.depreciation_rate ? `${asset.depreciation_rate}%` : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Purchase Date:</strong> {asset?.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div className="detail-section">
            <h3>Assignment</h3>
            <div className="detail-item">
              <strong>Location:</strong> {asset?.location_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Assigned To:</strong> {asset?.assigned_to_name || 'Unassigned'}
            </div>
            <div className="detail-item">
              <strong>Project:</strong> {asset?.project_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Supplier:</strong> {asset?.supplier_name || 'N/A'}
            </div>
          </div>

          {asset?.description && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h3>Description</h3>
              <p>{asset.description}</p>
            </div>
          )}

          {asset?.notes && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h3>Notes</h3>
              <p>{asset.notes}</p>
            </div>
          )}
        </div>

        {data?.history && data.history.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>History</h3>
            <div className="history-list">
              {data.history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-action">{item.action}</div>
                  <div className="history-meta">
                    by {item.performed_by_name} • {new Date(item.performed_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDetail;

