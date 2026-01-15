import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { FiFileText, FiDownload, FiBarChart2 } from 'react-icons/fi';
import AssetReport from './AssetReport';
import ContractReport from './ContractReport';
import StockReport from './StockReport';

const ReportsModule = () => {
  const [activeTab, setActiveTab] = useState('assets');

  return (
    <div>
      <div className="page-header">
        <h1>
          <FiBarChart2 style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Reports
        </h1>
        <p className="page-subtitle">Generate and export comprehensive reports</p>
      </div>

      <div className="module-tabs">
        <a
          href="#"
          className={activeTab === 'assets' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setActiveTab('assets'); }}
        >
          <FiFileText style={{ marginRight: '5px' }} />
          Asset Report
        </a>
        <a
          href="#"
          className={activeTab === 'contracts' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setActiveTab('contracts'); }}
        >
          <FiFileText style={{ marginRight: '5px' }} />
          Contract Report
        </a>
        <a
          href="#"
          className={activeTab === 'stock' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); setActiveTab('stock'); }}
        >
          <FiFileText style={{ marginRight: '5px' }} />
          Stock Report
        </a>
      </div>

      <div style={{ marginTop: '20px' }}>
        {activeTab === 'assets' && <AssetReport />}
        {activeTab === 'contracts' && <ContractReport />}
        {activeTab === 'stock' && <StockReport />}
      </div>
    </div>
  );
};

export default ReportsModule;

