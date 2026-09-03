// Minimal structured request logging — method, path, status, duration —
// so a production issue can be read out of Vercel's function logs (or any
// host's stdout) without having to reproduce it first. No dependency
// (morgan et al.) needed for this.
//
// Skips successful static-asset hits (every image/css/js on every page
// load) to keep the signal high — every /api request is logged
// regardless of outcome, since that's where the behavior worth watching
// actually happens, and any non-2xx response is logged no matter what
// path it's on.
function requestLog(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const isApi = req.path.startsWith('/api');
    if (!isApi && res.statusCode < 400) return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log('[req]', req.method, req.originalUrl, res.statusCode, ms.toFixed(1) + 'ms');
  });
  next();
}

module.exports = { requestLog };
