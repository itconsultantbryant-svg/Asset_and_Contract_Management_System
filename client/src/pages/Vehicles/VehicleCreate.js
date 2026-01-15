import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';

const VehicleCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: '',
    color: '',
    vehicle_type: 'Car',
    fuel_type: 'Petrol',
    purchase_date: '',
    purchase_price: '',
    currency: 'USD',
    location_id: '',
    assigned_to: '',
    project_id: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const [documentData, setDocumentData] = useState({
    file_name: '',
    code: '',
    category: '',
    project_id: ''
  });

  const { data: locations } = useQuery('locations', async () => {
    const response = await axios.get('/admin/locations');
    return response.data.locations;
  });

  const { data: users } = useQuery('users', async () => {
    const response = await axios.get('/admin/users');
    return response.data.users;
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const createMutation = useMutation(
    (data) => axios.post('/vehicles', data),
    {
      onSuccess: async (response) => {
        queryClient.invalidateQueries('vehicles');
        
        // Upload document if provided
        if (documentFile && documentData.file_name) {
          try {
            const formDataDoc = new FormData();
            formDataDoc.append('file', documentFile);
            formDataDoc.append('file_name', documentData.file_name);
            formDataDoc.append('code', documentData.code || '');
            formDataDoc.append('category', documentData.category || '');
            formDataDoc.append('project_id', documentData.project_id || formData.project_id || '');
            formDataDoc.append('entity_type', 'Vehicle');
            formDataDoc.append('entity_id', response.data.vehicleId);

            await axios.post('/documents', formDataDoc, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Vehicle and document created successfully');
          } catch (error) {
            toast.warning('Vehicle created but document upload failed');
          }
        } else {
          toast.success('Vehicle created successfully');
        }
        
        navigate(`/vehicles/${response.data.vehicleId}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create vehicle');
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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleDocumentDataChange = (e) => {
    const { name, value } = e.target;
    setDocumentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
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
        <h2>Add New Vehicle/Equipment</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormInput
            label="Registration Number"
            name="registration_number"
            value={formData.registration_number}
            onChange={handleChange}
            error={errors.registration_number}
            required
          />
          <FormInput
            label="Vehicle Type"
            name="vehicle_type"
            type="select"
            value={formData.vehicle_type}
            onChange={handleChange}
            error={errors.vehicle_type}
            required
            options={[
              { value: 'Car', label: 'Car' },
              { value: 'Truck', label: 'Truck' },
              { value: 'Motorbike', label: 'Motorbike' },
              { value: 'Generator', label: 'Generator' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Make"
            name="make"
            value={formData.make}
            onChange={handleChange}
            error={errors.make}
            required
          />
          <FormInput
            label="Model"
            name="model"
            value={formData.model}
            onChange={handleChange}
            error={errors.model}
            required
          />
          <FormInput
            label="Year"
            name="year"
            type="number"
            value={formData.year}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Color"
            name="color"
            value={formData.color}
            onChange={handleChange}
          />
          <FormInput
            label="Fuel Type"
            name="fuel_type"
            type="select"
            value={formData.fuel_type}
            onChange={handleChange}
            options={[
              { value: 'Petrol', label: 'Petrol' },
              { value: 'Diesel', label: 'Diesel' },
              { value: 'Electric', label: 'Electric' },
              { value: 'Hybrid', label: 'Hybrid' }
            ]}
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
          label="Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
        />

        <div className="form-section" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <h3 style={{ marginBottom: '20px', color: '#004C97' }}>Document Upload (Optional)</h3>
          <div className="form-row">
            <FormInput
              label="File Name"
              name="file_name"
              value={documentData.file_name}
              onChange={handleDocumentDataChange}
              placeholder="Enter document file name"
            />
            <FormInput
              label="Document Code"
              name="code"
              value={documentData.code}
              onChange={handleDocumentDataChange}
              placeholder="Enter document code"
            />
          </div>
          <div className="form-row">
            <FormInput
              label="Category"
              name="category"
              value={documentData.category}
              onChange={handleDocumentDataChange}
              placeholder="Enter document category"
            />
            <FormInput
              label="Project (for document)"
              name="project_id"
              type="select"
              value={documentData.project_id}
              onChange={handleDocumentDataChange}
              options={[
                { value: '', label: 'Select Project' },
                ...(projects || []).map(proj => ({ value: proj.id, label: proj.name }))
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="document_file">Upload Document</label>
            <input
              type="file"
              id="document_file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            <small className="form-text">Accepted formats: PDF, Word, Excel, Images</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/vehicles')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Creating...' : 'Create Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleCreate;

