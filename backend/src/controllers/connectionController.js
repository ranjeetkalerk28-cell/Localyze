const Connection = require('../models/Connection');

// @desc    Send a connection request to another business
// @route   POST /api/connections/:businessId
const sendConnectionRequest = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (businessId === req.business._id.toString()) {
      return res.status(400).json({ message: 'Cannot send a request to yourself' });
    }

    const existing = await Connection.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { requester: req.business._id, recipient: businessId },
        { requester: businessId, recipient: req.business._id },
      ],
    });
    if (existing) {
      return res.status(400).json({ message: 'A connection already exists or is pending' });
    }

    const connection = await Connection.create({ requester: req.business._id, recipient: businessId });
    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get connection status with another business
// @route   GET /api/connections/:businessId/status
const getConnectionStatus = async (req, res) => {
  try {
    const { businessId } = req.params;

    const connection = await Connection.findOne({
      $or: [
        { requester: req.business._id, recipient: businessId },
        { requester: businessId, recipient: req.business._id },
      ],
    });

    let status = 'none';
    if (connection) {
      if (connection.status === 'accepted') status = 'connected';
      else if (connection.status === 'pending') {
        status = connection.requester.toString() === req.business._id.toString() ? 'pending_sent' : 'pending_received';
      }
    }

    res.json({ status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get connection requests received by the logged-in business
// @route   GET /api/connections/requests/received
const getReceivedConnectionRequests = async (req, res) => {
  try {
    const requests = await Connection.find({ recipient: req.business._id, status: 'pending' })
      .populate('requester', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept or reject a connection request (recipient only)
// @route   PUT /api/connections/:id
const respondToConnectionRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const connection = await Connection.findById(req.params.id);

    if (!connection) return res.status(404).json({ message: 'Request not found' });
    if (connection.recipient.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    connection.status = status;
    await connection.save();
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove an existing accepted connection with another business
// @route   DELETE /api/connections/:businessId
const disconnectBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;

    const result = await Connection.findOneAndDelete({
      status: 'accepted',
      $or: [
        { requester: req.business._id, recipient: businessId },
        { requester: businessId, recipient: req.business._id },
      ],
    });
    if (!result) return res.status(404).json({ message: 'Connection not found' });

    res.json({ status: 'none' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendConnectionRequest,
  getConnectionStatus,
  getReceivedConnectionRequests,
  respondToConnectionRequest,
  disconnectBusiness,
};
