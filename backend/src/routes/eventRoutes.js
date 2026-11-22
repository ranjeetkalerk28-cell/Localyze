const express = require('express');
const router = express.Router();
const { createEvent, listEvents, getEventById, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Any signed-in account can browse events.
router.get('/', protect, listEvents);
router.get('/:id', protect, getEventById);

// Only businesses publish, and only their own events.
router.post('/', protect, requireRole('business'), createEvent);
router.put('/:id', protect, requireRole('business'), updateEvent);
router.delete('/:id', protect, requireRole('business'), deleteEvent);

module.exports = router;
