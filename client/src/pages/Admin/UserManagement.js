import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiEdit, FiTrash2, FiPlus, FiUserPlus } from 'react-icons/fi';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'Asset Manager',
    is_active: true
  });
  const [errors, setErrors] = useState({});

  const { data, isLoading } = useQuery('users', async () => {
    const response = await axios.get('/admin/users');
    return response.data.users;
  });

  const createMutation = useMutation(
    (userData) => axios.post('/admin/users', userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User created successfully');
        handleCloseModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => axios.put(`/admin/users/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User updated successfully');
        handleCloseModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => axios.delete(`/admin/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'Asset Manager',
        is_active: true
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role: 'Asset Manager',
      is_active: true
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!editingUser && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = { ...formData };
    if (editingUser && !submitData.password) {
      delete submitData.password;
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const columns = [
    { header: 'Username', accessor: 'username' },
    { header: 'Full Name', accessor: 'full_name' },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Role', 
      accessor: 'role',
      render: (value) => (
        <span className={`badge badge-${value === 'Administrator' ? 'danger' : 'info'}`}>
          {value}
        </span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (value) => (
        <span className={`badge ${value ? 'badge-success' : 'badge-secondary'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      header: 'Last Login', 
      accessor: 'last_login',
      render: (value) => value ? new Date(value).toLocaleString() : 'Never'
    }
  ];

  const actions = (row) => (
    <div className="table-actions">
      <button
        className="btn-icon"
        onClick={() => handleOpenModal(row)}
        title="Edit"
      >
        <FiEdit />
      </button>
      {row.id !== currentUser?.id && (
        <button
          className="btn-icon btn-danger"
          onClick={() => handleDelete(row)}
          title="Delete"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage system users and their roles</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Users</h3>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <FiUserPlus style={{ marginRight: '5px' }} />
            Add User
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data || []}
          loading={isLoading}
          actions={actions}
          emptyMessage="No users found"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Create User'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            required
            disabled={!!editingUser}
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <FormInput
            label="Full Name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            error={errors.full_name}
            required
          />

          <FormInput
            label="Role"
            name="role"
            type="select"
            value={formData.role}
            onChange={handleChange}
            options={[
              { value: 'Administrator', label: 'Administrator' },
              { value: 'Asset Manager', label: 'Asset Manager' },
              { value: 'Stock Manager', label: 'Stock Manager' }
            ]}
            required
          />

          <FormInput
            label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required={!editingUser}
          />

          <div className="form-input-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              <span>Active</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
