const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/auth');
const {
  getUserNotifications,
  markAsRead
} = require('../utils/notifications');

router.use(authenticate);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await getUserNotifications(req.user.id, limit);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
});

// Mark as read
router.put('/:id/read', async (req, res) => {
  try {
    await markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

module.exports = router;

