import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const tabs = [
    { id: 'suppliers', label: 'Suppliers', endpoint: '/admin/suppliers' },
    { id: 'categories', label: 'Asset Categories', endpoint: '/admin/asset-categories' },
    { id: 'projects', label: 'Projects', endpoint: '/admin/projects' },
    { id: 'locations', label: 'Locations', endpoint: '/admin/locations' }
  ];

  const { data, isLoading } = useQuery(
    [activeTab, 'master-data'],
    async () => {
      const tab = tabs.find(t => t.id === activeTab);
      const response = await axios.get(tab.endpoint);
      return response.data[activeTab] || response.data.suppliers || response.data.categories || response.data.projects || response.data.locations;
    }
  );

  const createMutation = useMutation(
    (itemData) => {
      const tab = tabs.find(t => t.id === activeTab);
      return axios.post(tab.endpoint, itemData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([activeTab, 'master-data']);
        toast.success('Item created successfully');
        handleCloseModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create item');
      }
    }
  );

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      setFormData(getDefaultFormData());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getDefaultFormData = () => {
    switch (activeTab) {
      case 'suppliers':
        return { name: '', contact_person: '', email: '', phone: '', address: '' };
      case 'categories':
        return { name: '', code: '', description: '', depreciation_rate: 0 };
      case 'projects':
        return { name: '', code: '', donor: '', start_date: '', end_date: '', budget: '', currency: 'USD' };
      case 'locations':
        return { name: '', type: 'Office', address: '' };
      default:
        return {};
    }
  };

  const getColumns = () => {
    switch (activeTab) {
      case 'suppliers':
        return [
          { header: 'Name', accessor: 'name' },
          { header: 'Contact Person', accessor: 'contact_person' },
          { header: 'Email', accessor: 'email' },
          { header: 'Phone', accessor: 'phone' }
        ];
      case 'categories':
        return [
          { header: 'Name', accessor: 'name' },
          { header: 'Code', accessor: 'code' },
          { header: 'Depreciation Rate', accessor: 'depreciation_rate', render: (value) => `${value || 0}%` }
        ];
      case 'projects':
        return [
          { header: 'Name', accessor: 'name' },
          { header: 'Code', accessor: 'code' },
          { header: 'Donor', accessor: 'donor' },
          { header: 'Start Date', accessor: 'start_date' },
          { header: 'End Date', accessor: 'end_date' }
        ];
      case 'locations':
        return [
          { header: 'Name', accessor: 'name' },
          { header: 'Type', accessor: 'type' },
          { header: 'Address', accessor: 'address' }
        ];
      default:
        return [];
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'suppliers':
        return (
          <>
            <FormInput label="Name" name="name" value={formData.name || ''} onChange={handleChange} required />
            <FormInput label="Contact Person" name="contact_person" value={formData.contact_person || ''} onChange={handleChange} />
            <FormInput label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
            <FormInput label="Phone" name="phone" value={formData.phone || ''} onChange={handleChange} />
            <FormInput label="Address" name="address" type="textarea" value={formData.address || ''} onChange={handleChange} />
          </>
        );
      case 'categories':
        return (
          <>
            <FormInput label="Name" name="name" value={formData.name || ''} onChange={handleChange} required />
            <FormInput label="Code" name="code" value={formData.code || ''} onChange={handleChange} />
            <FormInput label="Description" name="description" type="textarea" value={formData.description || ''} onChange={handleChange} />
            <FormInput label="Depreciation Rate (%)" name="depreciation_rate" type="number" value={formData.depreciation_rate || 0} onChange={handleChange} />
          </>
        );
      case 'projects':
        return (
          <>
            <FormInput label="Name" name="name" value={formData.name || ''} onChange={handleChange} required />
            <FormInput label="Code" name="code" value={formData.code || ''} onChange={handleChange} />
            <FormInput label="Donor" name="donor" value={formData.donor || ''} onChange={handleChange} />
            <FormInput label="Start Date" name="start_date" type="date" value={formData.start_date || ''} onChange={handleChange} required />
            <FormInput label="End Date" name="end_date" type="date" value={formData.end_date || ''} onChange={handleChange} required />
            <FormInput label="Budget" name="budget" type="number" value={formData.budget || ''} onChange={handleChange} />
            <FormInput label="Currency" name="currency" type="select" value={formData.currency || 'USD'} onChange={handleChange} 
              options={[{ value: 'USD', label: 'USD' }, { value: 'LRD', label: 'LRD' }, { value: 'EUR', label: 'EUR' }]} />
          </>
        );
      case 'locations':
        return (
          <>
            <FormInput label="Name" name="name" value={formData.name || ''} onChange={handleChange} required />
            <FormInput label="Type" name="type" type="select" value={formData.type || 'Office'} onChange={handleChange} required
              options={[
                { value: 'Office', label: 'Office' },
                { value: 'Warehouse', label: 'Warehouse' },
                { value: 'Field', label: 'Field' },
                { value: 'Other', label: 'Other' }
              ]} />
            <FormInput label="Address" name="address" type="textarea" value={formData.address || ''} onChange={handleChange} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Master Data</h1>
        <p className="page-subtitle">Manage system configuration and reference data</p>
      </div>

      <div className="module-tabs">
        {tabs.map(tab => (
          <a
            key={tab.id}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab(tab.id);
            }}
            className={activeTab === tab.id ? 'active' : ''}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus style={{ marginRight: '5px' }} />
            Add {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}
          </button>
        </div>

        <DataTable
          columns={getColumns()}
          data={data || []}
          loading={isLoading}
          emptyMessage={`No ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found`}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`${editingItem ? 'Edit' : 'Create'} ${tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}`}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          {renderForm()}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MasterData;
