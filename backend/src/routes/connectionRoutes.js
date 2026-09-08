const express = require('express');
const router = express.Router();
const {
  sendConnectionRequest,
  getConnectionStatus,
  getReceivedConnectionRequests,
  respondToConnectionRequest,
  disconnectBusiness,
} = require('../controllers/connectionController');
const { protect, requireRole } = require('../middleware/authMiddleware');

router.use(protect, requireRole('business'));

router.get('/requests/received', getReceivedConnectionRequests);
router.put('/:id', respondToConnectionRequest);
router.get('/:businessId/status', getConnectionStatus);
router.post('/:businessId', sendConnectionRequest);
router.delete('/:businessId', disconnectBusiness);

module.exports = router;
