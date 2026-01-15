import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const ContractCreate = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    contract_type: 'Service',
    vendor_id: '',
    start_date: '',
    end_date: '',
    value: '',
    currency: 'USD',
    project_id: '',
    description: '',
    terms: '',
    payment_schedule: '',
    auto_renewal: false,
    renewal_notice_days: 90
  });
  const [errors, setErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const [documentData, setDocumentData] = useState({
    file_name: '',
    code: '',
    category: '',
    project_id: ''
  });

  // All hooks must be called before any conditional returns
  const { data: suppliers } = useQuery('suppliers', async () => {
    const response = await axios.get('/admin/suppliers');
    return response.data.suppliers;
  }, {
    enabled: isAdmin // Only fetch if user is admin
  });

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  }, {
    enabled: isAdmin // Only fetch if user is admin
  });

  const createMutation = useMutation(
    (data) => axios.post('/contracts', data),
    {
      onSuccess: async (response) => {
        queryClient.invalidateQueries('contracts');
        
        // Upload document if provided
        if (documentFile && documentData.file_name) {
          try {
            const formDataDoc = new FormData();
            formDataDoc.append('file', documentFile);
            formDataDoc.append('file_name', documentData.file_name);
            formDataDoc.append('code', documentData.code || '');
            formDataDoc.append('category', documentData.category || '');
            formDataDoc.append('project_id', documentData.project_id || formData.project_id || '');
            formDataDoc.append('entity_type', 'Contract');
            formDataDoc.append('entity_id', response.data.contractId);

            await axios.post('/documents', formDataDoc, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Contract and document created successfully');
          } catch (error) {
            toast.warning('Contract created but document upload failed');
          }
        } else {
          toast.success('Contract created successfully');
        }
        
        navigate(`/contracts/${response.data.contractId}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create contract');
        if (error.response?.data?.errors) {
          setErrors(error.response.data.errors);
        }
      }
    }
  );

  // Check admin status after all hooks
  if (!isAdmin) {
    return (
      <div className="card">
        <div className="error">Only administrators can create contracts.</div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        <h2>Create New Contract</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormInput
            label="Contract Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
          />
          <FormInput
            label="Contract Type"
            name="contract_type"
            type="select"
            value={formData.contract_type}
            onChange={handleChange}
            error={errors.contract_type}
            required
            options={[
              { value: 'MOU', label: 'MOU (Memorandum of Understanding)' },
              { value: 'SLA', label: 'SLA (Service Level Agreement)' },
              { value: 'Service', label: 'Service Contract' },
              { value: 'Supply', label: 'Supply Contract' },
              { value: 'Consultancy', label: 'Consultancy Contract' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Vendor/Supplier"
            name="vendor_id"
            type="select"
            value={formData.vendor_id}
            onChange={handleChange}
            options={[
              { value: '', label: 'Select Vendor' },
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
            label="Start Date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleChange}
            error={errors.start_date}
            required
          />
          <FormInput
            label="End Date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            error={errors.end_date}
            required
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Contract Value"
            name="value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={handleChange}
            error={errors.value}
            required
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

        <FormInput
          label="Description"
          name="description"
          type="textarea"
          value={formData.description}
          onChange={handleChange}
          rows={4}
        />

        <FormInput
          label="Terms & Conditions"
          name="terms"
          type="textarea"
          value={formData.terms}
          onChange={handleChange}
          rows={6}
          placeholder="Enter contract terms and conditions..."
        />

        <FormInput
          label="Payment Schedule"
          name="payment_schedule"
          type="textarea"
          value={formData.payment_schedule}
          onChange={handleChange}
          rows={4}
          placeholder="Describe payment milestones and schedule..."
        />

        <div className="form-row">
          <div className="form-input-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="auto_renewal"
                checked={formData.auto_renewal}
                onChange={handleChange}
              />
              <span>Auto Renewal</span>
            </label>
          </div>
          <FormInput
            label="Renewal Notice (Days)"
            name="renewal_notice_days"
            type="number"
            value={formData.renewal_notice_days}
            onChange={handleChange}
          />
        </div>

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
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/contracts')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Creating...' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContractCreate;

