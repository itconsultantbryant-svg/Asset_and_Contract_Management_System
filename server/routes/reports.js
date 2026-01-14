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

    sql += ' ORDER BY a.created_at DESC';
    const assets = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Assets');

      worksheet.columns = [
        { header: 'Asset ID', key: 'asset_id', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category_name', width: 20 },
        { header: 'Status', key: 'status_name', width: 15 },
        { header: 'Location', key: 'location_name', width: 20 },
        { header: 'Assigned To', key: 'assigned_to_name', width: 20 },
        { header: 'Purchase Price', key: 'purchase_price', width: 15 },
        { header: 'Current Value', key: 'current_value', width: 15 }
      ];

      assets.forEach(asset => {
        worksheet.addRow(asset);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=assets-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=assets-report.pdf');
      doc.pipe(res);

      doc.fontSize(20).text('Assets Report', { align: 'center' });
      doc.moveDown();

      assets.forEach((asset, index) => {
        doc.fontSize(12).text(`${index + 1}. ${asset.asset_id} - ${asset.name}`);
        doc.fontSize(10).text(`   Category: ${asset.category_name || 'N/A'} | Status: ${asset.status_name || 'N/A'} | Location: ${asset.location_name || 'N/A'}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.json({ success: true, assets, count: assets.length });
    }
  } catch (error) {
    logger.error('Asset report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate asset report' });
  }
});

// Stock report
router.get('/stock', async (req, res) => {
  try {
    let sql = `
      SELECT 
        si.*,
        sc.name as category_name,
        l.name as location_name,
        (si.current_quantity * si.unit_cost) as total_value
      FROM stock_items si
      LEFT JOIN stock_categories sc ON si.category_id = sc.id
      LEFT JOIN locations l ON si.location_id = l.id
      WHERE si.deleted_at IS NULL
    `;
    const params = [];

    if (req.query.category_id) {
      sql += ' AND si.category_id = ?';
      params.push(req.query.category_id);
    }
    if (req.query.location_id) {
      sql += ' AND si.location_id = ?';
      params.push(req.query.location_id);
    }

    sql += ' ORDER BY si.name';
    const items = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Stock Items');

      worksheet.columns = [
        { header: 'Item Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category_name', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Quantity', key: 'current_quantity', width: 15 },
        { header: 'Unit Cost', key: 'unit_cost', width: 15 },
        { header: 'Total Value', key: 'total_value', width: 15 },
        { header: 'Location', key: 'location_name', width: 20 }
      ];

      items.forEach(item => {
        worksheet.addRow(item);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({ success: true, items, count: items.length });
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

    sql += ' ORDER BY c.created_at DESC';
    const contracts = await db.query(sql, params);

    const format = req.query.format || 'json';

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Contracts');

      worksheet.columns = [
        { header: 'Contract Number', key: 'contract_number', width: 20 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Type', key: 'contract_type', width: 15 },
        { header: 'Vendor', key: 'vendor_name', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Value', key: 'value', width: 15 }
      ];

      contracts.forEach(contract => {
        worksheet.addRow(contract);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=contracts-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.json({ success: true, contracts, count: contracts.length });
    }
  } catch (error) {
    logger.error('Contract report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate contract report' });
  }
});

module.exports = router;

