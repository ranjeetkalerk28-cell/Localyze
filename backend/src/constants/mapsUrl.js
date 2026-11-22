// A business can paste a Google Maps link that visitors click, so only https links
// on Google's own map hosts are accepted (blocks javascript: URLs and lookalike domains).
const MAPS_HOSTS = new Set(['maps.app.goo.gl', 'maps.google.com']);
const MAPS_URL_MAX_LENGTH = 500;

function isValidMapsUrl(value) {
  if (typeof value !== 'string' || value.length > MAPS_URL_MAX_LENGTH) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (MAPS_HOSTS.has(host)) return true;
  if (host === 'google.com' || host === 'www.google.com') return url.pathname.startsWith('/maps');
  if (host === 'goo.gl') return url.pathname.startsWith('/maps');
  return false;
}

module.exports = { isValidMapsUrl, MAPS_URL_MAX_LENGTH };
