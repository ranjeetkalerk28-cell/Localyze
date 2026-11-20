const Connection = require('../models/Connection');
const Business = require('../models/Business');

const getRecommendations = async (req, res) => {
  try {
    const { _id, city } = req.business;
    const connections = await Connection.find({
      status: { $in: ['pending', 'accepted'] },
      $or: [{ requester: _id }, { recipient: _id }],
    }).select('requester recipient').lean();
    const excluded = connections.map(({ requester, recipient }) => requester.equals(_id) ? recipient : requester);
    const businesses = await Business.find({ city, _id: { $nin: [_id, ...excluded] } })
      .select('businessName industry logoUrl').sort({ businessName: 1, _id: 1 }).limit(3).lean();
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a connection request to another business
// @route   POST /api/connections/:businessId
const sendConnectionRequest = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (businessId.toLowerCase() === req.business._id.toString()) {
      return res.status(400).json({ message: 'Cannot send a request to yourself' });
    }

    await Connection.init();
    const pair = Connection.openPair(req.business._id, businessId);
    let existing = await Connection.findOne(pair);
    if (!existing) {
      try {
        const connection = await Connection.create({ requester: req.business._id, recipient: businessId });
        return res.status(201).json(connection);
      } catch (error) {
        if (error.code !== 11000 || !error.keyPattern?.pairKey) throw error;
        existing = await Connection.findOne(pair);
      }
    }
    return res.status(400).json({
      message: 'A connection already exists or is pending',
      status: Connection.viewerStatus(existing, req.business._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get connection status with another business
// @route   GET /api/connections/:businessId/status
const getConnectionStatus = async (req, res) => {
  try {
    const { businessId } = req.params;

    const connection = await Connection.findOne(Connection.openPair(req.business._id, businessId));
    res.json({ status: Connection.viewerStatus(connection, req.business._id) });
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
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    const connection = await Connection.findOneAndUpdate(
      { _id: req.params.id, recipient: req.business._id, status: 'pending' },
      { $set: { status } },
      { new: true }
    );
    if (connection) return res.json(connection);

    const current = await Connection.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Request not found' });
    if (!current.recipient.equals(req.business._id)) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }
    if (current.status === status) return res.json(current);
    return res.status(409).json({ message: 'This connection request has already been resolved' });
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
  getRecommendations,
  sendConnectionRequest,
  getConnectionStatus,
  getReceivedConnectionRequests,
  respondToConnectionRequest,
  disconnectBusiness,
};
