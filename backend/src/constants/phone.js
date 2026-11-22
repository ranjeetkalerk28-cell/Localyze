// Phone numbers are stored in a normalised form (digits with an optional leading +),
// so the frontend can use them directly in a tel: link. Spaces, dashes and
// brackets typed by the user are stripped before validating.
const PHONE_REGEX = /^\+?[0-9]{10,13}$/;

const normalizePhone = (value) => String(value ?? '').replace(/[\s\-().]/g, '');

const isValidPhone = (value) => PHONE_REGEX.test(normalizePhone(value));

module.exports = { normalizePhone, isValidPhone };
