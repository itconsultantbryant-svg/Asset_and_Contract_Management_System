import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';

const StockExit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    stock_item_id: '',
    quantity: '',
    reason_id: '',
    reference_number: '',
    notes: '',
    location_id: '',
    project_id: '',
    beneficiary_id: '',
    movement_date: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});

  const { data: items } = useQuery('stock-items', async () => {
    const response = await axios.get('/stock/items');
    return response.data.items;
  });

  const { data: reasons } = useQuery('exit-reasons', async () => {
    return [
      { id: 1, name: 'Usage' },
      { id: 2, name: 'Transfer Out' },
      { id: 3, name: 'Disposal' },
      { id: 4, name: 'Loss' },
      { id: 5, name: 'Damage' }
    ];
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const exitMutation = useMutation(
    (data) => axios.post('/stock/exit', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stock-items');
        toast.success('Stock exit recorded successfully');
        setFormData({
          stock_item_id: '',
          quantity: '',
          reason_id: '',
          reference_number: '',
          notes: '',
          location_id: '',
          project_id: '',
          beneficiary_id: '',
          movement_date: new Date().toISOString().split('T')[0]
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to record stock exit');
        if (error.response?.data?.errors) {
          setErrors(error.response.data.errors);
        }
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        submitData[key] = null;
      }
    });
    exitMutation.mutate(submitData);
  };

  const selectedItem = items?.find(item => item.id === parseInt(formData.stock_item_id));

  return (
    <div className="card">
      <div className="page-header">
        <h2>Stock Exit</h2>
        <p className="page-subtitle">Record stock issued (usage, transfers, disposal)</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormInput
            label="Stock Item"
            name="stock_item_id"
            type="select"
            value={formData.stock_item_id}
            onChange={handleChange}
            error={errors.stock_item_id}
            required
            options={[
              { value: '', label: 'Select Stock Item' },
              ...(items || []).map(item => ({ 
                value: item.id, 
                label: `${item.name} (Available: ${item.current_quantity || 0} ${item.unit})` 
              }))
            ]}
          />
          <FormInput
            label="Movement Date"
            name="movement_date"
            type="date"
            value={formData.movement_date}
            onChange={handleChange}
            error={errors.movement_date}
            required
          />
        </div>

        {selectedItem && (
          <div className="alert-item alert-info" style={{ marginBottom: '20px' }}>
            Available: <strong>{selectedItem.current_quantity || 0} {selectedItem.unit}</strong>
          </div>
        )}

        <div className="form-row">
          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={handleChange}
            error={errors.quantity}
            required
          />
          <FormInput
            label="Reason"
            name="reason_id"
            type="select"
            value={formData.reason_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Reason' },
              ...(reasons || []).map(reason => ({ value: reason.id, label: reason.name }))
            ]}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Project"
            name="project_id"
            type="select"
            value={formData.project_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Project' },
              ...(projects || []).map(proj => ({ value: proj.id, label: proj.name }))
            ]}
          />
          <FormInput
            label="Reference Number"
            name="reference_number"
            value={formData.reference_number}
            onChange={handleChange}
            placeholder="Receipt, transfer doc, etc."
          />
        </div>

        <FormInput
          label="Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
        />

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/stock')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={exitMutation.isLoading}>
            {exitMutation.isLoading ? 'Recording...' : 'Record Exit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockExit;

