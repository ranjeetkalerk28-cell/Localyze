// Shared username format, used by both account types: 3-30 characters,
// lowercase letters, numbers, periods, or underscores (no spaces).
const USERNAME_REGEX = /^[a-z0-9_.]{3,30}$/;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(username);
}

module.exports = { USERNAME_REGEX, isValidUsername };
