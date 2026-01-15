const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../utils/auth');
const { logAudit } = require('../utils/audit');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

// Generate unique document code
async function generateDocumentCode() {
  const prefix = 'PIL-DOC';
  const year = new Date().getFullYear();
  const count = await db.get('SELECT COUNT(*) as count FROM documents WHERE document_code LIKE ?', [`${prefix}-${year}-%`]);
  const sequence = (count.count || 0) + 1;
  return `${prefix}-${year}-${String(sequence).padStart(5, '0')}`;
}

// Get all documents with filters
router.get('/', async (req, res) => {
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

    if (req.query.document_code) {
      sql += ' AND d.document_code LIKE ?';
      params.push(`%${req.query.document_code}%`);
    }
    if (req.query.file_name) {
      sql += ' AND d.file_name LIKE ?';
      params.push(`%${req.query.file_name}%`);
    }
    if (req.query.project_id) {
      sql += ' AND d.project_id = ?';
      params.push(req.query.project_id);
    }
    if (req.query.category) {
      sql += ' AND d.category = ?';
      params.push(req.query.category);
    }
    if (req.query.entity_type) {
      sql += ' AND d.entity_type = ?';
      params.push(req.query.entity_type);
    }
    if (req.query.entity_id) {
      sql += ' AND d.entity_id = ?';
      params.push(req.query.entity_id);
    }
    if (req.query.from_date) {
      sql += ' AND DATE(d.uploaded_at) >= ?';
      params.push(req.query.from_date);
    }
    if (req.query.to_date) {
      sql += ' AND DATE(d.uploaded_at) <= ?';
      params.push(req.query.to_date);
    }

    sql += ' ORDER BY d.uploaded_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(req.query.limit) || 50, parseInt(req.query.offset) || 0);

    const documents = await db.query(sql, params);
    res.json({ success: true, documents });
  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to get documents' });
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const document = await db.get(`
      SELECT 
        d.*,
        p.name as project_name,
        u.full_name as uploaded_by_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = ? AND d.deleted_at IS NULL
    `, [req.params.id]);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, document });
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({ success: false, message: 'Failed to get document' });
  }
});

// Upload document
router.post('/', upload.single('file'), [
  body('file_name').notEmpty().withMessage('File name is required'),
  body('category').optional(),
  body('project_id').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const documentCode = await generateDocumentCode();
    const {
      file_name,
      category,
      project_id,
      entity_type,
      entity_id
    } = req.body;

    const result = await db.query(`
      INSERT INTO documents (
        document_code, file_name, original_file_name, file_path,
        file_type, file_size, category, project_id,
        entity_type, entity_id, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      documentCode,
      file_name,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      category || null,
      project_id || null,
      entity_type || null,
      entity_id || null,
      req.user.id
    ]);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'DOCUMENT',
      entityId: result.lastID,
      description: `Uploaded document: ${file_name} (${documentCode})`,
      newData: { file_name, category, project_id },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, documentId: result.lastID, document_code: documentCode });
  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

// Download document
router.get('/:id/download', async (req, res) => {
  try {
    const document = await db.get('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.download(document.file_path, document.original_file_name, (err) => {
      if (err) {
        logger.error('Download error:', err);
        res.status(500).json({ success: false, message: 'Failed to download file' });
      }
    });
  } catch (error) {
    logger.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Failed to download document' });
  }
});

// View document (serve file)
router.get('/:id/view', async (req, res) => {
  try {
    const document = await db.get('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    res.setHeader('Content-Type', document.file_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_file_name}"`);
    res.sendFile(path.resolve(document.file_path));
  } catch (error) {
    logger.error('View document error:', error);
    res.status(500).json({ success: false, message: 'Failed to view document' });
  }
});

// Delete document
router.delete('/:id', authorize('Administrator'), async (req, res) => {
  try {
    const document = await db.get('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await db.query('UPDATE documents SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'DOCUMENT',
      entityId: req.params.id,
      description: `Deleted document: ${document.file_name}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

module.exports = router;

