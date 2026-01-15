import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DocumentList from './DocumentList';
import DocumentCreate from './DocumentCreate';

const DocumentModule = () => {
  return (
    <Routes>
      <Route index element={<DocumentList />} />
      <Route path="create" element={<DocumentCreate />} />
      <Route path="*" element={<Navigate to="/documents" replace />} />
    </Routes>
  );
};

export default DocumentModule;

