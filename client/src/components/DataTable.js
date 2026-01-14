import React from 'react';
import './DataTable.css';

const DataTable = ({ 
  columns, 
  data, 
  loading, 
  onRowClick,
  actions,
  emptyMessage = 'No data available'
}) => {
  if (loading) {
    return (
      <div className="table-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} style={{ width: column.width }}>
                {column.header}
              </th>
            ))}
            {actions && <th style={{ width: '150px' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex}>
                  {column.render 
                    ? column.render(row[column.accessor], row)
                    : row[column.accessor]
                  }
                </td>
              ))}
              {actions && (
                <td onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

