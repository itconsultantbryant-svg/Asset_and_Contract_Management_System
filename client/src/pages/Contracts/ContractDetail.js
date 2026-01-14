import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCheck, FiClock, FiFileText } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneFormData, setMilestoneFormData] = useState({
    milestone_name: '',
    due_date: '',
    amount: '',
    currency: 'USD',
    notes: ''
  });

  const { data, isLoading, error } = useQuery(
    ['contract', id],
    async () => {
      const response = await axios.get(`/contracts/${id}`);
      return response.data;
    }
  );

  const approveMutation = useMutation(
    () => axios.post(`/contracts/${id}/approve`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contract', id]);
        queryClient.invalidateQueries('contracts');
        toast.success('Contract approved');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve contract');
      }
    }
  );

  const milestoneMutation = useMutation(
    (data) => axios.post(`/contracts/${id}/milestones`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['contract', id]);
        toast.success('Milestone added successfully');
        setShowMilestoneModal(false);
        setMilestoneFormData({
          milestone_name: '',
          due_date: '',
          amount: '',
          currency: 'USD',
          notes: ''
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add milestone');
      }
    }
  );

  if (isLoading) return <div className="loading">Loading contract details...</div>;
  if (error) return <div className="error">Failed to load contract details</div>;

  const contract = data?.contract;
  const milestones = data?.milestones || [];
  const documents = data?.documents || [];

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

  const milestoneColumns = [
    { header: 'Milestone', accessor: 'milestone_name' },
    { header: 'Due Date', accessor: 'due_date', render: (value) => new Date(value).toLocaleDateString() },
    { header: 'Amount', accessor: 'amount', render: (value, row) => value ? `${row.currency} ${parseFloat(value).toLocaleString()}` : 'N/A' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (value) => (
        <span className={`badge ${value === 'Completed' ? 'badge-success' : value === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
          {value}
        </span>
      )
    },
    { header: 'Completed Date', accessor: 'completed_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' }
  ];

  const handleMilestoneSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...milestoneFormData };
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        submitData[key] = null;
      }
    });
    milestoneMutation.mutate(submitData);
  };

  const daysRemaining = contract?.end_date 
    ? Math.ceil((new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/contracts')} style={{ marginBottom: '20px' }}>
        <FiArrowLeft style={{ marginRight: '5px' }} />
        Back to Contracts
      </button>

      <div className="card">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{contract?.title}</h2>
              <p style={{ color: '#7f8c8d', marginTop: '5px' }}>
                {contract?.contract_number} • Version {contract?.version || 1}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className={`badge ${getStatusBadge(contract?.status)}`} style={{ fontSize: '14px', padding: '8px 15px' }}>
                {contract?.status}
              </span>
              {isAdmin && contract?.status === 'Draft' && (
                <button 
                  className="btn btn-success" 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isLoading}
                >
                  <FiCheck style={{ marginRight: '5px' }} />
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>

        {daysRemaining !== null && daysRemaining <= 90 && (
          <div className={`alert-item ${daysRemaining <= 30 ? 'alert-danger' : daysRemaining <= 60 ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: '20px' }}>
            <FiClock style={{ marginRight: '5px' }} />
            <strong>{daysRemaining} days</strong> remaining until expiration ({new Date(contract.end_date).toLocaleDateString()})
          </div>
        )}

        <div className="detail-grid">
          <div className="detail-section">
            <h3>Contract Information</h3>
            <div className="detail-item">
              <strong>Contract Number:</strong> {contract?.contract_number}
            </div>
            <div className="detail-item">
              <strong>Type:</strong> {contract?.contract_type}
            </div>
            <div className="detail-item">
              <strong>Status:</strong> {contract?.status}
            </div>
            <div className="detail-item">
              <strong>Version:</strong> {contract?.version || 1}
            </div>
            <div className="detail-item">
              <strong>Vendor:</strong> {contract?.vendor_name || 'N/A'}
            </div>
            {contract?.vendor_contact && (
              <div className="detail-item">
                <strong>Contact:</strong> {contract.vendor_contact}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Dates & Value</h3>
            <div className="detail-item">
              <strong>Start Date:</strong> {contract?.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>End Date:</strong> {contract?.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Contract Value:</strong> {contract?.value ? `${contract.currency} ${parseFloat(contract.value).toLocaleString()}` : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Project:</strong> {contract?.project_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Auto Renewal:</strong> {contract?.auto_renewal ? 'Yes' : 'No'}
            </div>
            {contract?.renewal_notice_days && (
              <div className="detail-item">
                <strong>Renewal Notice:</strong> {contract.renewal_notice_days} days
              </div>
            )}
          </div>

          {contract?.description && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h3>Description</h3>
              <p>{contract.description}</p>
            </div>
          )}

          {contract?.terms && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h3>Terms & Conditions</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{contract.terms}</p>
            </div>
          )}

          {contract?.payment_schedule && (
            <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
              <h3>Payment Schedule</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{contract.payment_schedule}</p>
            </div>
          )}
        </div>

        {milestones.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h3>
                <FiFileText style={{ marginRight: '8px' }} />
                Payment Milestones
              </h3>
              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setShowMilestoneModal(true)}>
                  Add Milestone
                </button>
              )}
            </div>
            <DataTable
              columns={milestoneColumns}
              data={milestones}
              emptyMessage="No milestones defined"
            />
          </div>
        )}

        {isAdmin && milestones.length === 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h3>Payment Milestones</h3>
              <button className="btn btn-primary" onClick={() => setShowMilestoneModal(true)}>
                Add Milestone
              </button>
            </div>
            <div className="empty-state">No milestones defined. Add milestones to track payments.</div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        title="Add Payment Milestone"
        size="medium"
      >
        <form onSubmit={handleMilestoneSubmit}>
          <FormInput
            label="Milestone Name"
            name="milestone_name"
            value={milestoneFormData.milestone_name}
            onChange={(e) => setMilestoneFormData(prev => ({ ...prev, milestone_name: e.target.value }))}
            required
          />

          <div className="form-row">
            <FormInput
              label="Due Date"
              name="due_date"
              type="date"
              value={milestoneFormData.due_date}
              onChange={(e) => setMilestoneFormData(prev => ({ ...prev, due_date: e.target.value }))}
              required
            />
            <FormInput
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              value={milestoneFormData.amount}
              onChange={(e) => setMilestoneFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
            <FormInput
              label="Currency"
              name="currency"
              type="select"
              value={milestoneFormData.currency}
              onChange={(e) => setMilestoneFormData(prev => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'LRD', label: 'LRD' },
                { value: 'EUR', label: 'EUR' }
              ]}
            />
          </div>

          <FormInput
            label="Notes"
            name="notes"
            type="textarea"
            value={milestoneFormData.notes}
            onChange={(e) => setMilestoneFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowMilestoneModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={milestoneMutation.isLoading}>
              {milestoneMutation.isLoading ? 'Adding...' : 'Add Milestone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContractDetail;

