import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';

const AssetCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    status_id: '',
    serial_number: '',
    model: '',
    purchase_date: '',
    purchase_price: '',
    currency: 'USD',
    supplier_id: '',
    project_id: '',
    location_id: '',
    assigned_to: '',
    warranty_expiry: '',
    depreciation_rate: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const { data: categories } = useQuery('asset-categories', async () => {
    const response = await axios.get('/admin/asset-categories');
    return response.data.categories;
  });

  const { data: suppliers } = useQuery('suppliers', async () => {
    const response = await axios.get('/admin/suppliers');
    return response.data.suppliers;
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const { data: locations } = useQuery('locations', async () => {
    const response = await axios.get('/admin/locations');
    return response.data.locations;
  });

  const { data: users } = useQuery('users', async () => {
    const response = await axios.get('/admin/users');
    return response.data.users;
  });

  const createMutation = useMutation(
    (data) => axios.post('/assets', data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('assets');
        toast.success('Asset created successfully');
        navigate(`/assets/${response.data.assetId}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create asset');
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
    // Convert empty strings to null for optional fields
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        submitData[key] = null;
      }
    });
    createMutation.mutate(submitData);
  };

  return (
    <div className="card">
      <div className="page-header">
        <h2>Create New Asset</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormInput
            label="Asset Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
          />
          <FormInput
            label="Category"
            name="category_id"
            type="select"
            value={formData.category_id}
            onChange={handleChange}
            error={errors.category_id}
            required
            options={[
              { value: '', label: 'Select Category' },
              ...(categories || []).map(cat => ({ value: cat.id, label: cat.name }))
            ]}
          />
        </div>

        <FormInput
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleChange}
          rows={3}
        />

        <div className="form-row">
          <FormInput
            label="Serial Number"
            name="serial_number"
            value={formData.serial_number}
            onChange={handleChange}
          />
          <FormInput
            label="Model"
            name="model"
            value={formData.model}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Purchase Date"
            name="purchase_date"
            type="date"
            value={formData.purchase_date}
            onChange={handleChange}
          />
          <FormInput
            label="Purchase Price"
            name="purchase_price"
            type="number"
            step="0.01"
            value={formData.purchase_price}
            onChange={handleChange}
          />
          <FormInput
            label="Currency"
            name="currency"
            type="select"
            value={formData.currency}
            onChange={handleChange}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'LRD', label: 'LRD' },
              { value: 'EUR', label: 'EUR' }
            ]}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Supplier"
            name="supplier_id"
            type="select"
            value={formData.supplier_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Supplier' },
              ...(suppliers || []).map(sup => ({ value: sup.id, label: sup.name }))
            ]}
          />
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
        </div>

        <div className="form-row">
          <FormInput
            label="Location"
            name="location_id"
            type="select"
            value={formData.location_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Location' },
              ...(locations || []).map(loc => ({ value: loc.id, label: loc.name }))
            ]}
          />
          <FormInput
            label="Assigned To"
            name="assigned_to"
            type="select"
            value={formData.assigned_to}
            onChange={handleChange}
            options={[
              { value: '', label: 'Unassigned' },
              ...(users || []).map(u => ({ value: u.id, label: u.full_name }))
            ]}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Warranty Expiry"
            name="warranty_expiry"
            type="date"
            value={formData.warranty_expiry}
            onChange={handleChange}
          />
          <FormInput
            label="Depreciation Rate (%)"
            name="depreciation_rate"
            type="number"
            step="0.01"
            value={formData.depreciation_rate}
            onChange={handleChange}
          />
        </div>

        <FormInput
          label="Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
        />

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/assets')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetCreate;

