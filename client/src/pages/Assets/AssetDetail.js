import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffData, setWriteOffData] = useState({
    writeoff_date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  });

  const { data, isLoading, error } = useQuery(
    ['asset', id],
    async () => {
      const response = await axios.get(`/assets/${id}`);
      return response.data;
    }
  );

  const writeOffMutation = useMutation(
    (data) => axios.post(`/assets/${id}/writeoff`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['asset', id]);
        queryClient.invalidateQueries('assets');
        toast.success('Asset written off successfully');
        setShowWriteOffModal(false);
        setWriteOffData({
          writeoff_date: new Date().toISOString().split('T')[0],
          reason: '',
          notes: ''
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to write-off asset');
      }
    }
  );

  const handleWriteOffChange = (e) => {
    const { name, value } = e.target;
    setWriteOffData(prev => ({ ...prev, [name]: value }));
  };

  const handleWriteOffSubmit = (e) => {
    e.preventDefault();
    writeOffMutation.mutate(writeOffData);
  };

  if (isLoading) return <div className="loading">Loading asset details...</div>;
  if (error) return <div className="error">Failed to load asset details</div>;

  const asset = data?.asset;
  const isWriteOff = asset?.status_name?.toLowerCase().includes('write') || 
                     asset?.status_name?.toLowerCase().includes('used') ||
                     asset?.status_name?.toLowerCase() === 'used';

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/assets')} style={{ marginBottom: '20px' }}>
        <FiArrowLeft style={{ marginRight: '5px' }} />
        Back to Assets
      </button>

      <div className="card">
        <div className="page-header">
          <h2>{asset?.name} ({asset?.asset_id})</h2>
          {!isWriteOff && (
            <button 
              className="btn btn-danger" 
              onClick={() => setShowWriteOffModal(true)}
            >
              Write-Off Asset
            </button>
          )}
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

      <Modal 
        isOpen={showWriteOffModal} 
        onClose={() => setShowWriteOffModal(false)}
        title="Write-Off Asset"
      >
        <form onSubmit={handleWriteOffSubmit}>
          <FormInput
            label="Write-Off Date"
            name="writeoff_date"
            type="date"
            value={writeOffData.writeoff_date}
            onChange={handleWriteOffChange}
            required
          />
          <FormInput
            label="Reason"
            name="reason"
            type="textarea"
            value={writeOffData.reason}
            onChange={handleWriteOffChange}
            rows={4}
            required
            placeholder="Enter reason for write-off..."
          />
          <FormInput
            label="Notes"
            name="notes"
            type="textarea"
            value={writeOffData.notes}
            onChange={handleWriteOffChange}
            rows={3}
            placeholder="Additional notes (optional)..."
          />
          
          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setShowWriteOffModal(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-danger" 
              disabled={writeOffMutation.isLoading}
            >
              {writeOffMutation.isLoading ? 'Processing...' : 'Write-Off Asset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetDetail;

