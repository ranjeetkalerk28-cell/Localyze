const Collaboration = require('../models/Collaboration');
const Connection = require('../models/Connection');

const normalizeStatus = (collaboration) => {
  const item = collaboration.toObject ? collaboration.toObject() : collaboration;
  return { ...item, status: item.status === 'accepted' ? 'active' : item.status };
};

// @desc    Send a collaboration request to another business
// @route   POST /api/collaborations
const sendCollaborationRequest = async (req, res) => {
  try {
    const { recipientId, message } = req.body;

    if (req.business._id.equals(recipientId)) {
      return res.status(400).json({ message: 'Cannot send a request to yourself' });
    }

    await Collaboration.init();
    const pending = {
      requester: req.business._id,
      recipient: recipientId,
      status: 'pending',
    };
    const existing = await Collaboration.findOne(pending);
    if (existing) {
      return res.status(200).json(existing);
    }

    let collaboration;
    try {
      collaboration = await Collaboration.create({
        ...pending, message, requestKey: `${req.business._id}:${recipientId.toLowerCase()}`,
      });
    } catch (error) {
      if (error.code !== 11000 || !error.keyPattern?.requestKey) throw error;
      const concurrent = await Collaboration.findOne(pending);
      if (concurrent) return res.json(concurrent);
      return res.status(409).json({ message: 'The request was already resolved. Refresh the profile for its current status.' });
    }

    res.status(201).json(collaboration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get requests received by the logged-in business
// @route   GET /api/collaborations/received
const getReceivedRequests = async (req, res) => {
  try {
    const requests = await Collaboration.find({ recipient: req.business._id })
      .populate('requester', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });
    res.json(requests.map(normalizeStatus));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get requests sent by the logged-in business
// @route   GET /api/collaborations/sent
const getSentRequests = async (req, res) => {
  try {
    const requests = await Collaboration.find({ requester: req.business._id })
      .populate('recipient', 'businessName logoUrl industry')
      .sort({ createdAt: -1 });
    res.json(requests.map(normalizeStatus));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function acceptCollaboration(filter) {
  await Connection.init();
  // A concurrent connection insert can abort an upsert with a duplicate key.
  // Retry from a new transaction so both writes see the newly committed pair.
  for (let attempt = 1; ; attempt++) {
    try {
      return await Collaboration.db.transaction(async (session) => {
        const collaboration = await Collaboration.findOneAndUpdate(
          filter, { $set: { status: 'active' } }, { new: true, session }
        );
        if (collaboration) {
          await Connection.acceptForCollaboration(collaboration.requester, collaboration.recipient, session);
        }
        return collaboration;
      });
    } catch (error) {
      if (attempt >= 3 || error.code !== 11000 || !error.keyPattern?.pairKey) throw error;
    }
  }
}

// @desc    Accept or reject a collaboration request (recipient only)
// @route   PUT /api/collaborations/:id
const respondToRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'active' or 'rejected'
    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or rejected' });
    }

    const filter = { _id: req.params.id, recipient: req.business._id, status: 'pending' };
    const updated = status === 'active'
      ? await acceptCollaboration(filter)
      : await Collaboration.findOneAndUpdate(filter, { $set: { status } }, { new: true });
    if (updated) return res.json(normalizeStatus(updated));

    const current = await Collaboration.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Request not found' });
    if (!current.recipient.equals(req.business._id)) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }
    const result = normalizeStatus(current);
    if (result.status === status) return res.json(result);
    return res.status(409).json({ message: 'This collaboration request has already been resolved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark an active collaboration as completed
// @route   PUT /api/collaborations/:id/complete
const completeCollaboration = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    const isParticipant = [collaboration.requester, collaboration.recipient]
      .some((businessId) => businessId.toString() === req.business._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized to complete this collaboration' });
    if (!['active', 'accepted'].includes(collaboration.status)) {
      return res.status(400).json({ message: 'Only active collaborations can be completed' });
    }

    collaboration.status = 'completed';
    await collaboration.save();
    res.json(normalizeStatus(collaboration));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendCollaborationRequest,
  getReceivedRequests,
  getSentRequests,
  respondToRequest,
  completeCollaboration,
};
