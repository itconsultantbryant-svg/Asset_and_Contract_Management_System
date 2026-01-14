import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiArrowLeft, FiDroplet, FiTool } from 'react-icons/fi';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-toastify';

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [fuelFormData, setFuelFormData] = useState({
    quantity: '',
    unit_cost: '',
    currency: 'USD',
    odometer_reading: '',
    hours_reading: '',
    purchase_date: new Date().toISOString().split('T')[0],
    supplier: '',
    receipt_number: '',
    project_id: '',
    purpose: '',
    notes: ''
  });

  const { data, isLoading, error } = useQuery(
    ['vehicle', id],
    async () => {
      const response = await axios.get(`/vehicles/${id}`);
      return response.data;
    }
  );

  const fuelMutation = useMutation(
    (data) => axios.post(`/vehicles/${id}/fuel`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle', id]);
        toast.success('Fuel log recorded successfully');
        setShowFuelModal(false);
        setFuelFormData({
          quantity: '',
          unit_cost: '',
          currency: 'USD',
          odometer_reading: '',
          hours_reading: '',
          purchase_date: new Date().toISOString().split('T')[0],
          supplier: '',
          receipt_number: '',
          project_id: '',
          purpose: '',
          notes: ''
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to log fuel');
      }
    }
  );

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  if (isLoading) return <div className="loading">Loading vehicle details...</div>;
  if (error) return <div className="error">Failed to load vehicle details</div>;

  const vehicle = data?.vehicle;
  const fuelLogs = data?.fuelLogs || [];
  const maintenance = data?.maintenance || [];

  const fuelColumns = [
    { header: 'Date', accessor: 'purchase_date', render: (value) => new Date(value).toLocaleDateString() },
    { header: 'Quantity', accessor: 'quantity', render: (value) => `${value}L` },
    { header: 'Unit Cost', accessor: 'unit_cost', render: (value, row) => `${row.currency} ${parseFloat(value).toFixed(2)}` },
    { header: 'Total Cost', accessor: 'total_cost', render: (value, row) => `${row.currency} ${parseFloat(value).toFixed(2)}` },
    { header: 'Odometer', accessor: 'odometer_reading' },
    { header: 'Project', accessor: 'project_name' },
    { header: 'Logged By', accessor: 'logged_by_name' }
  ];

  const maintenanceColumns = [
    { header: 'Type', accessor: 'maintenance_type' },
    { header: 'Scheduled Date', accessor: 'scheduled_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { header: 'Completed Date', accessor: 'completed_date', render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { header: 'Status', accessor: 'status', render: (value) => (
      <span className={`badge ${value === 'Completed' ? 'badge-success' : value === 'Scheduled' ? 'badge-info' : 'badge-warning'}`}>
        {value}
      </span>
    )},
    { header: 'Cost', accessor: 'cost', render: (value, row) => value ? `${row.currency} ${parseFloat(value).toFixed(2)}` : 'N/A' },
    { header: 'Service Provider', accessor: 'service_provider' }
  ];

  const handleFuelSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...fuelFormData, fuel_type: vehicle.fuel_type };
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        submitData[key] = null;
      }
    });
    fuelMutation.mutate(submitData);
  };

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/vehicles')} style={{ marginBottom: '20px' }}>
        <FiArrowLeft style={{ marginRight: '5px' }} />
        Back to Vehicles
      </button>

      <div className="card">
        <div className="page-header">
          <h2>{vehicle?.make} {vehicle?.model} ({vehicle?.registration_number})</h2>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowFuelModal(true)}>
              <FiDroplet style={{ marginRight: '5px' }} />
              Log Fuel
            </button>
            <button className="btn btn-primary" onClick={() => setShowMaintenanceModal(true)}>
              <FiTool style={{ marginRight: '5px' }} />
              Schedule Maintenance
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-section">
            <h3>Vehicle Information</h3>
            <div className="detail-item">
              <strong>Vehicle ID:</strong> {vehicle?.vehicle_id}
            </div>
            <div className="detail-item">
              <strong>Registration:</strong> {vehicle?.registration_number}
            </div>
            <div className="detail-item">
              <strong>Type:</strong> {vehicle?.vehicle_type}
            </div>
            <div className="detail-item">
              <strong>Fuel Type:</strong> {vehicle?.fuel_type}
            </div>
            <div className="detail-item">
              <strong>Year:</strong> {vehicle?.year || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Color:</strong> {vehicle?.color || 'N/A'}
            </div>
          </div>

          <div className="detail-section">
            <h3>Current Status</h3>
            <div className="detail-item">
              <strong>Status:</strong> {vehicle?.status}
            </div>
            <div className="detail-item">
              <strong>Current Mileage:</strong> {vehicle?.current_mileage || 0} km
            </div>
            <div className="detail-item">
              <strong>Current Hours:</strong> {vehicle?.current_hours || 0} hrs
            </div>
            <div className="detail-item">
              <strong>Location:</strong> {vehicle?.location_name || 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Assigned To:</strong> {vehicle?.assigned_to_name || 'Unassigned'}
            </div>
            <div className="detail-item">
              <strong>Project:</strong> {vehicle?.project_name || 'N/A'}
            </div>
          </div>

          <div className="detail-section">
            <h3>Important Dates</h3>
            <div className="detail-item">
              <strong>Insurance Expiry:</strong> {vehicle?.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString() : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>License Expiry:</strong> {vehicle?.license_expiry ? new Date(vehicle.license_expiry).toLocaleDateString() : 'N/A'}
            </div>
            <div className="detail-item">
              <strong>Inspection Expiry:</strong> {vehicle?.inspection_expiry ? new Date(vehicle.inspection_expiry).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        {fuelLogs.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Fuel Logs</h3>
            <DataTable
              columns={fuelColumns}
              data={fuelLogs}
              emptyMessage="No fuel logs recorded"
            />
          </div>
        )}

        {maintenance.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Maintenance History</h3>
            <DataTable
              columns={maintenanceColumns}
              data={maintenance}
              emptyMessage="No maintenance records"
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={showFuelModal}
        onClose={() => setShowFuelModal(false)}
        title="Log Fuel Purchase"
        size="medium"
      >
        <form onSubmit={handleFuelSubmit}>
          <div className="form-row">
            <FormInput
              label="Purchase Date"
              name="purchase_date"
              type="date"
              value={fuelFormData.purchase_date}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              required
            />
            <FormInput
              label="Quantity (Liters)"
              name="quantity"
              type="number"
              step="0.01"
              value={fuelFormData.quantity}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, quantity: e.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <FormInput
              label="Unit Cost"
              name="unit_cost"
              type="number"
              step="0.01"
              value={fuelFormData.unit_cost}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, unit_cost: e.target.value }))}
              required
            />
            <FormInput
              label="Currency"
              name="currency"
              type="select"
              value={fuelFormData.currency}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, currency: e.target.value }))}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'LRD', label: 'LRD' }
              ]}
            />
          </div>

          <div className="form-row">
            <FormInput
              label={vehicle?.vehicle_type === 'Generator' ? 'Hours Reading' : 'Odometer Reading'}
              name={vehicle?.vehicle_type === 'Generator' ? 'hours_reading' : 'odometer_reading'}
              type="number"
              value={vehicle?.vehicle_type === 'Generator' ? fuelFormData.hours_reading : fuelFormData.odometer_reading}
              onChange={(e) => {
                if (vehicle?.vehicle_type === 'Generator') {
                  setFuelFormData(prev => ({ ...prev, hours_reading: e.target.value }));
                } else {
                  setFuelFormData(prev => ({ ...prev, odometer_reading: e.target.value }));
                }
              }}
            />
            <FormInput
              label="Project"
              name="project_id"
              type="select"
              value={fuelFormData.project_id}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, project_id: e.target.value }))}
              options={[
                { value: '', label: 'Select Project' },
                ...(projects || []).map(proj => ({ value: proj.id, label: proj.name }))
              ]}
            />
          </div>

          <div className="form-row">
            <FormInput
              label="Supplier"
              name="supplier"
              value={fuelFormData.supplier}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, supplier: e.target.value }))}
            />
            <FormInput
              label="Receipt Number"
              name="receipt_number"
              value={fuelFormData.receipt_number}
              onChange={(e) => setFuelFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
            />
          </div>

          <FormInput
            label="Purpose"
            name="purpose"
            value={fuelFormData.purpose}
            onChange={(e) => setFuelFormData(prev => ({ ...prev, purpose: e.target.value }))}
          />

          <FormInput
            label="Notes"
            name="notes"
            type="textarea"
            value={fuelFormData.notes}
            onChange={(e) => setFuelFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowFuelModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={fuelMutation.isLoading}>
              {fuelMutation.isLoading ? 'Logging...' : 'Log Fuel'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="Schedule Maintenance"
        size="medium"
      >
        <p>Maintenance scheduling form will be implemented here.</p>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowMaintenanceModal(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleDetail;

