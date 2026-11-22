// An event is listed from the moment it is created until it ends: upcoming and
// ongoing events show, ended ones drop out. `endsAt` already accounts for
// overnight sessions (see utils/eventTime.js), so this one check covers them.
const eventVisibleFilter = (now = new Date()) => ({ status: 'active', endsAt: { $gt: now } });

module.exports = { eventVisibleFilter };
