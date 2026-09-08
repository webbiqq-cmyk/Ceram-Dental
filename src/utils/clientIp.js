// Trustworthy client-IP resolution behind Cloudflare / a reverse proxy.
//
// We never parse a raw X-Forwarded-For ourselves (any client can send that
// header). Instead:
//   - behind Cloudflare: use CF-Connecting-IP, but ONLY if the immediate
//     TCP peer is a real Cloudflare edge address;
//   - behind a plain proxy (TRUST_PROXY = hop count): use Express' req.ip,
//     which already walked X-Forwarded-For within the trusted hop count;
//   - otherwise: the socket's remote address.
const net = require('node:net');
const { BEHIND_CLOUDFLARE } = require('../config/production');
const CF_RANGES = require('../config/cloudflareIps');

const strip = ip => String(ip || '').replace(/^::ffff:/i, '').trim();

function ipToBig(ip) {
  ip = strip(ip);
  if (net.isIPv4(ip)) return ip.split('.').reduce((a, o) => (a << 8n) + BigInt(o), 0n);
  if (!net.isIPv6(ip)) return null;
  let [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const parts = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  if (parts.length !== 8) return null;
  return parts.reduce((a, p) => (a << 16n) + BigInt(parseInt(p || '0', 16)), 0n);
}

function inCidr(ip, cidr) {
  const [range, bitsRaw] = cidr.split('/');
  const v4 = net.isIPv4(strip(range));
  if (v4 !== net.isIPv4(strip(ip))) return false; // family mismatch
  const width = v4 ? 32n : 128n;
  const bits = BigInt(bitsRaw ?? Number(width));
  if (bits < 0n || bits > width) return false;
  const a = ipToBig(ip), b = ipToBig(range);
  if (a == null || b == null) return false;
  const shift = width - bits;
  return (a >> shift) === (b >> shift);
}

// True if `ip` matches any exact address or CIDR in `list`.
function ipInList(ip, list) {
  const clean = strip(ip);
  if (!clean || !Array.isArray(list) || !list.length) return false;
  return list.some(entry => {
    entry = entry.trim();
    if (!entry) return false;
    return entry.includes('/') ? inCidr(clean, entry) : clean === strip(entry);
  });
}

function fromCloudflare(req) {
  return ipInList((req.socket && req.socket.remoteAddress) || '', CF_RANGES);
}

function clientIp(req) {
  if (BEHIND_CLOUDFLARE && fromCloudflare(req)) {
    const cf = req.headers['cf-connecting-ip'];
    if (cf && net.isIP(strip(cf))) return strip(cf);
  }
  // req.ip honours the app's configured `trust proxy` setting; falls back to
  // the socket address when trust proxy is off.
  return strip(req.ip || (req.socket && req.socket.remoteAddress) || '');
}

// Express middleware — stamps req.clientIp once per request.
function clientIpMiddleware(req, _res, next) { req.clientIp = clientIp(req); next(); }

module.exports = { clientIp, clientIpMiddleware, ipInList };
