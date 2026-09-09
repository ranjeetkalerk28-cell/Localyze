const express = require('express');
const router = express.Router();
const {
  sendCollaborationRequest,
  getReceivedRequests,
  getSentRequests,
  respondToRequest,
  completeCollaboration,
} = require('../controllers/collaborationController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// All collaboration routes are business-only
router.use(protect, requireRole('business'));

router.post('/', sendCollaborationRequest);
router.get('/received', getReceivedRequests);
router.get('/sent', getSentRequests);
router.put('/:id', respondToRequest);
router.put('/:id/complete', completeCollaboration);

module.exports = router;
