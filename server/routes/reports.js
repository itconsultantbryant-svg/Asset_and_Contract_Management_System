const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate } = require('../utils/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

router.use(authenticate);

// Asset report
router.get('/assets', async (req, res) => {
  try {
    let sql = `
      SELECT 
        a.*,
        ac.name as category_name,
        ast.name as status_name,
        s.name as supplier_name,
        p.name as project_name,
        l.name as location_name,
        u.full_name as assigned_to_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN asset_statuses ast ON a.status_id = ast.id
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.category_id) {
      sql += ' AND a.category_id = ?';
      params.push(req.query.category_id);
    }
    if (req.query.project_id) {
      sql += ' AND a.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.location_id) {
      sql += ' AND a.location_id = ?';
      params.push(req.query.location_id);
    }
    if (req.query.search) {
      sql += ' AND (a.asset_id LIKE ? OR a.name LIKE ? OR a.serial_number LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (req.query.from_date) {
      sql += ' AND DATE(a.purchase_date) >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      sql += ' AND DATE(a.purchase_date) <= ?';
      params.push(req.query.to_date);
    }

    sql += ' ORDER BY a.created_at DESC';
    const assets = await db.query(sql, params);

    // Calculate depreciation and Net Book Value for each asset
    const assetsWithCalculations = assets.map(asset => {
      const acquisitionValue = parseFloat(asset.purchase_price) || 0;
      const depreciationRate = parseFloat(asset.depreciation_rate) || 0;
      const purchaseDate = asset.purchase_date ? new Date(asset.purchase_date) : new Date();
      const today = new Date();
      const daysSincePurchase = Math.max(0, Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24)));
      
      // Daily depreciation: (depreciation_rate % × acquisition_value) / 365
      const dailyDepreciation = (depreciationRate / 100) * acquisitionValue / 365;
      const totalDepreciation = dailyDepreciation * daysSincePurchase;
      
      // Net Book Value = Acquisition Value - Total Depreciation
      const netBookValue = Math.max(0, acquisitionValue - totalDepreciation);
      
      // Determine status: In-Use, Used, or Write-off
      let status = 'In-Use';
      if (asset.status_name) {
        const statusLower = asset.status_name.toLowerCase();
        if (statusLower.includes('write') || statusLower.includes('off') || statusLower === 'used') {
          status = 'Used';
        } else if (statusLower.includes('in-use') || statusLower.includes('active')) {
          status = 'In-Use';
        } else {
          status = asset.status_name;
        }
      }

      return {
        ...asset,
        code: asset.asset_id,
        acquisition_value: acquisitionValue,
        depreciation_value_percent: depreciationRate,
        daily_depreciation: dailyDepreciation,
        total_depreciation: totalDepreciation,
        net_book_value: netBookValue,
        calculated_status: status,
        days_since_purchase: daysSincePurchase
      };
    });

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets Report');

      worksheet.columns = [
        { header: 'Code', key: 'code', width: 18 },
        { header: 'Asset Name', key: 'name', width: 35 },
        { header: 'Category', key: 'category_name', width: 20 },
        { header: 'Acquisition Value', key: 'acquisition_value', width: 18 },
        { header: 'Depreciation (%)', key: 'depreciation_value_percent', width: 16 },
        { header: 'Total Depreciation', key: 'total_depreciation', width: 18 },
        { header: 'Net Book Value', key: 'net_book_value', width: 18 },
        { header: 'Status', key: 'calculated_status', width: 15 },
        { header: 'Location', key: 'location_name', width: 20 },
        { header: 'Project', key: 'project_name', width: 20 }
      ];

      assetsWithCalculations.forEach(asset => {
        worksheet.addRow({
          code: asset.code,
          name: asset.name,
          category_name: asset.category_name || 'N/A',
          acquisition_value: asset.acquisition_value.toFixed(2),
          depreciation_value_percent: asset.depreciation_value_percent.toFixed(2),
          total_depreciation: asset.total_depreciation.toFixed(2),
          net_book_value: asset.net_book_value.toFixed(2),
          calculated_status: asset.calculated_status,
          location_name: asset.location_name || 'N/A',
          project_name: asset.project_name || 'N/A'
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=assets-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=assets-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Assets Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      assetsWithCalculations.forEach((asset, index) => {
        doc.fontSize(12).text(`${index + 1}. ${asset.code} - ${asset.name}`);
        doc.fontSize(10)
          .text(`Category: ${asset.category_name || 'N/A'} | Status: ${asset.calculated_status}`)
          .text(`Acquisition Value: ${asset.currency || 'USD'} ${asset.acquisition_value.toFixed(2)} | Depreciation: ${asset.depreciation_value_percent.toFixed(2)}%`)
          .text(`Total Depreciation: ${asset.currency || 'USD'} ${asset.total_depreciation.toFixed(2)} | Net Book Value: ${asset.currency || 'USD'} ${asset.net_book_value.toFixed(2)}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, assets: assetsWithCalculations, count: assetsWithCalculations.length });
    }
  } catch (error) {
    logger.error('Asset report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate asset report' });
  }
});

// Stock report
router.get('/stock', async (req, res) => {
  try {
    // Get stock movements with details
    let sql = `
      SELECT 
        sm.*,
        si.name as stock_name,
        si.unit,
        si.unit_cost,
        si.currency,
        p.name as project_name,
        l.name as location_name,
        smr.name as reason_name
      FROM stock_movements sm
      LEFT JOIN stock_items si ON sm.stock_item_id = si.id
      LEFT JOIN projects p ON sm.project_id = p.id
      LEFT JOIN locations l ON sm.location_id = l.id
      LEFT JOIN stock_movement_reasons smr ON sm.reason_id = smr.id
      WHERE si.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.stock_item_id) {
      sql += ' AND sm.stock_item_id = ?';
      params.push(req.query.stock_item_id);
    }
    if (req.query.project_id) {
      sql += ' AND sm.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.location_id) {
      sql += ' AND sm.location_id = ?';
      params.push(req.query.location_id);
    }
    if (req.query.search) {
      sql += ' AND (si.name LIKE ? OR sm.reference_number LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (req.query.from_date) {
      sql += ' AND DATE(sm.movement_date) >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      sql += ' AND DATE(sm.movement_date) <= ?';
      params.push(req.query.to_date);
    }

    sql += ' ORDER BY sm.movement_date DESC, sm.created_at DESC';
    const movements = await db.query(sql, params);

    // Calculate available quantity and value for each movement
    // We need to track running totals per stock item
    const stockItemTotals = {};
    const stockReport = movements.map(movement => {
      const itemId = movement.stock_item_id;
      if (!stockItemTotals[itemId]) {
        stockItemTotals[itemId] = {
          entry: 0,
          exit: 0,
          available: 0
        };
      }

      if (movement.movement_type === 'Entry') {
        stockItemTotals[itemId].entry += parseFloat(movement.quantity) || 0;
        stockItemTotals[itemId].available += parseFloat(movement.quantity) || 0;
      } else if (movement.movement_type === 'Exit') {
        stockItemTotals[itemId].exit += parseFloat(movement.quantity) || 0;
        stockItemTotals[itemId].available -= parseFloat(movement.quantity) || 0;
      }

      const availableQty = stockItemTotals[itemId].available;
      const unitCost = parseFloat(movement.unit_cost) || 0;
      const valueCost = availableQty * unitCost;
      const status = availableQty > 0 ? 'Available' : 'Out of Stock';

      return {
        ...movement,
        available_qty: availableQty,
        value_cost: valueCost,
        status: status,
        entry_qty: stockItemTotals[itemId].entry,
        exit_qty: stockItemTotals[itemId].exit
      };
    });

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stock Report');

      worksheet.columns = [
        { header: 'Stock Name', key: 'stock_name', width: 30 },
        { header: 'Movement Date', key: 'movement_date', width: 15 },
        { header: 'Available Qty', key: 'available_qty', width: 15 },
        { header: 'Unit Cost', key: 'unit_cost', width: 15 },
        { header: 'Value Cost', key: 'value_cost', width: 18 },
        { header: 'Project', key: 'project_name', width: 25 },
        { header: 'Reference No.', key: 'reference_number', width: 20 },
        { header: 'Location', key: 'location_name', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Movement Type', key: 'movement_type', width: 15 }
      ];

      stockReport.forEach(item => {
        worksheet.addRow({
          stock_name: item.stock_name || 'N/A',
          movement_date: item.movement_date ? new Date(item.movement_date).toLocaleDateString() : 'N/A',
          available_qty: item.available_qty.toFixed(2),
          unit_cost: item.unit_cost ? parseFloat(item.unit_cost).toFixed(2) : '0.00',
          value_cost: item.value_cost.toFixed(2),
          project_name: item.project_name || 'N/A',
          reference_number: item.reference_number || 'N/A',
          location_name: item.location_name || 'N/A',
          status: item.status,
          movement_type: item.movement_type
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Stock Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      stockReport.forEach((item, index) => {
        doc.fontSize(12).text(`${index + 1}. ${item.stock_name || 'N/A'}`);
        doc.fontSize(10)
          .text(`Movement Date: ${item.movement_date ? new Date(item.movement_date).toLocaleDateString() : 'N/A'} | Available Qty: ${item.available_qty.toFixed(2)} ${item.unit || ''}`)
          .text(`Unit Cost: ${item.currency || 'USD'} ${item.unit_cost ? parseFloat(item.unit_cost).toFixed(2) : '0.00'} | Value Cost: ${item.currency || 'USD'} ${item.value_cost.toFixed(2)}`)
          .text(`Project: ${item.project_name || 'N/A'} | Reference: ${item.reference_number || 'N/A'} | Location: ${item.location_name || 'N/A'}`)
          .text(`Status: ${item.status} | Type: ${item.movement_type}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, items: stockReport, count: stockReport.length });
    }
  } catch (error) {
    logger.error('Stock report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate stock report' });
  }
});

// Contract report
router.get('/contracts', async (req, res) => {
  try {
    let sql = `
      SELECT 
        c.*,
        s.name as vendor_name,
        p.name as project_name
      FROM contracts c
      LEFT JOIN suppliers s ON c.vendor_id = s.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.status) {
      sql += ' AND c.status = ?';
      params.push(req.query.status);
    }
    if (req.query.project_id) {
      sql += ' AND c.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.search) {
      sql += ' AND (c.contract_number LIKE ? OR c.title LIKE ? OR s.name LIKE ?)';
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (req.query.from_date) {
      sql += ' AND DATE(c.start_date) >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      sql += ' AND DATE(c.end_date) <= ?';
      params.push(req.query.to_date);
    }

    sql += ' ORDER BY c.created_at DESC';
    const contracts = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Contracts Report');

      worksheet.columns = [
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Contract Title', key: 'title', width: 40 },
        { header: 'Type', key: 'contract_type', width: 18 },
        { header: 'Vendor/Supplier', key: 'vendor_name', width: 25 },
        { header: 'Project', key: 'project_name', width: 25 },
        { header: 'Contract Value', key: 'value', width: 18 },
        { header: 'Currency', key: 'currency', width: 12 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      contracts.forEach(contract => {
        worksheet.addRow({
          start_date: contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A',
          end_date: contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A',
          title: contract.title,
          contract_type: contract.contract_type,
          vendor_name: contract.vendor_name || 'N/A',
          project_name: contract.project_name || 'N/A',
          value: contract.value ? parseFloat(contract.value).toFixed(2) : '0.00',
          currency: contract.currency || 'USD',
          status: contract.status
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=contracts-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=contracts-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Contracts Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      contracts.forEach((contract, index) => {
        doc.fontSize(12).text(`${index + 1}. ${contract.title} (${contract.contract_number})`);
        doc.fontSize(10)
          .text(`Type: ${contract.contract_type} | Vendor: ${contract.vendor_name || 'N/A'} | Project: ${contract.project_name || 'N/A'}`)
          .text(`Start Date: ${contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'} | End Date: ${contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}`)
          .text(`Value: ${contract.currency || 'USD'} ${contract.value ? parseFloat(contract.value).toFixed(2) : '0.00'} | Status: ${contract.status}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, contracts, count: contracts.length });
    }
  } catch (error) {
    logger.error('Contract report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate contract report' });
  }
});

// Vehicle report
router.get('/vehicles', async (req, res) => {
  try {
    let sql = `
      SELECT 
        v.*,
        l.name as location_name,
        u.full_name as assigned_to_name,
        p.name as project_name
      FROM vehicles v
      LEFT JOIN locations l ON v.location_id = l.id
      LEFT JOIN users u ON v.assigned_to = u.id
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.location_id) {
      sql += ' AND v.location_id = ?';
      params.push(req.query.location_id);
    }
    if (req.query.project_id) {
      sql += ' AND v.project_id = ?';
      params.push(req.query.project_id);
    }

    sql += ' ORDER BY v.created_at DESC';
    const vehicles = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Vehicles');

      worksheet.columns = [
        { header: 'Vehicle ID', key: 'vehicle_id', width: 20 },
        { header: 'Registration', key: 'registration_number', width: 20 },
        { header: 'Make', key: 'make', width: 15 },
        { header: 'Model', key: 'model', width: 15 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Type', key: 'vehicle_type', width: 15 },
        { header: 'Location', key: 'location_name', width: 20 },
        { header: 'Assigned To', key: 'assigned_to_name', width: 20 }
      ];

      vehicles.forEach(vehicle => {
        worksheet.addRow(vehicle);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=vehicles-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=vehicles-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Vehicles Report', { align: 'center' });
      doc.moveDown();

      vehicles.forEach((vehicle, index) => {
        doc.fontSize(12).text(`${index + 1}. ${vehicle.vehicle_id} - ${vehicle.make} ${vehicle.model}`);
        doc.fontSize(10).text(`   Registration: ${vehicle.registration_number || 'N/A'} | Location: ${vehicle.location_name || 'N/A'}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, vehicles, count: vehicles.length });
    }
  } catch (error) {
    logger.error('Vehicle report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate vehicle report' });
  }
});

// Documents report
router.get('/documents', async (req, res) => {
  try {
    let sql = `
      SELECT 
        d.*,
        p.name as project_name,
        u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.project_id) {
      sql += ' AND d.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.category) {
      sql += ' AND d.category = ?';
      params.push(req.query.category);
    }
    if (req.query.from_date) {
      sql += ' AND DATE(d.uploaded_at) >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      sql += ' AND DATE(d.uploaded_at) <= ?';
      params.push(req.query.to_date);
    }

    sql += ' ORDER BY d.uploaded_at DESC';
    const documents = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Documents');

      worksheet.columns = [
        { header: 'Document Code', key: 'document_code', width: 20 },
        { header: 'File Name', key: 'file_name', width: 40 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Project', key: 'project_name', width: 25 },
        { header: 'Entity Type', key: 'entity_type', width: 15 },
        { header: 'Uploaded By', key: 'uploaded_by_name', width: 20 },
        { header: 'Upload Date', key: 'uploaded_at', width: 15 }
      ];

      documents.forEach(doc => {
        worksheet.addRow(doc);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=documents-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=documents-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Documents Report', { align: 'center' });
      doc.moveDown();

      documents.forEach((document, index) => {
        doc.fontSize(12).text(`${index + 1}. ${document.document_code} - ${document.file_name}`);
        doc.fontSize(10).text(`   Category: ${document.category || 'N/A'} | Project: ${document.project_name || 'N/A'}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, documents, count: documents.length });
    }
  } catch (error) {
    logger.error('Documents report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate documents report' });
  }
});

module.exports = router;

