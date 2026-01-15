import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import FormInput from '../../components/FormInput';
import { FiUpload } from 'react-icons/fi';

const DocumentCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    file_name: '',
    code: '',
    category: '',
    project_id: ''
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const { data: projects } = useQuery('projects', async () => {
    const response = await axios.get('/admin/projects');
    return response.data.projects;
  });

  const uploadMutation = useMutation(
    (formDataUpload) => {
      const data = new FormData();
      data.append('file', formDataUpload.file);
      data.append('file_name', formDataUpload.file_name);
      data.append('code', formDataUpload.code || '');
      data.append('category', formDataUpload.category || '');
      data.append('project_id', formDataUpload.project_id || '');
      
      return axios.post('/documents', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('documents');
        toast.success('Document uploaded successfully');
        navigate('/documents');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to upload document');
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
      setFile(e.target.files[0]);
      if (!formData.file_name) {
        setFormData(prev => ({ ...prev, file_name: e.target.files[0].name }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.file_name) {
      toast.error('Please enter a file name');
      return;
    }

    uploadMutation.mutate({
      file,
      ...formData
    });
  };

  return (
    <div className="card">
      <div className="page-header">
        <h2>Upload Document</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <FormInput
            label="File Name"
            name="file_name"
            value={formData.file_name}
            onChange={handleChange}
            error={errors.file_name}
            required
          />
          <FormInput
            label="Document Code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Optional - auto-generated if not provided"
          />
        </div>

        <div className="form-row">
          <FormInput
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="Enter document category"
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

        <div className="form-group">
          <label htmlFor="file">Upload Document</label>
          <div style={{ 
            border: '2px dashed #ddd', 
            borderRadius: '8px', 
            padding: '20px', 
            textAlign: 'center',
            backgroundColor: '#f9f9f9'
          }}>
            <input
              type="file"
              id="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="file" style={{ cursor: 'pointer', display: 'block' }}>
              <FiUpload style={{ fontSize: '32px', marginBottom: '10px', color: '#004C97' }} />
              <div>
                {file ? (
                  <div>
                    <strong>{file.name}</strong>
                    <br />
                    <small>{(file.size / 1024).toFixed(2)} KB</small>
                  </div>
                ) : (
                  <div>
                    <strong>Click to select file</strong>
                    <br />
                    <small>PDF, Word, Excel, Images (Max 10MB)</small>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/documents')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={uploadMutation.isLoading}>
            {uploadMutation.isLoading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentCreate;

