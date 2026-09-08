const Collaboration = require('../models/Collaboration');
const Connection = require('../models/Connection');

// @desc    Send a collaboration request to another business
// @route   POST /api/collaborations
const sendCollaborationRequest = async (req, res) => {
  try {
    const { recipientId, message } = req.body;

    if (recipientId === req.business._id.toString()) {
      return res.status(400).json({ message: 'Cannot send a request to yourself' });
    }

    const existing = await Collaboration.findOne({
      requester: req.business._id,
      recipient: recipientId,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ message: 'Request already pending' });
    }

    const collaboration = await Collaboration.create({
      requester: req.business._id,
      recipient: recipientId,
      message,
    });

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
    res.json(requests);
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
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept or reject a collaboration request (recipient only)
// @route   PUT /api/collaborations/:id
const respondToRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) return res.status(404).json({ message: 'Request not found' });
    if (collaboration.recipient.toString() !== req.business._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be accepted or rejected' });
    }

    collaboration.status = status;
    await collaboration.save();

    if (status === 'accepted') {
      const existingConnection = await Connection.findOne({
        $or: [
          { requester: collaboration.requester, recipient: collaboration.recipient },
          { requester: collaboration.recipient, recipient: collaboration.requester },
        ],
      });
      if (!existingConnection) {
        await Connection.create({
          requester: collaboration.requester,
          recipient: collaboration.recipient,
          status: 'accepted',
        });
      } else if (existingConnection.status !== 'accepted') {
        existingConnection.status = 'accepted';
        await existingConnection.save();
      }
    }

    res.json(collaboration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendCollaborationRequest,
  getReceivedRequests,
  getSentRequests,
  respondToRequest,
};
