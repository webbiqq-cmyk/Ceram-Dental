// Express 4 does not forward a rejected Promise from an async route
// handler to the error-handling middleware on its own — a throw or
// rejection inside `async function foo(req, res) {...}` becomes an
// unhandled promise rejection instead, which Node (by default, this
// project's version included) treats as fatal: it crashes the *entire*
// process, taking down every other in-flight request — the public site,
// all three portals, everyone — over one bad request to one endpoint.
// (Confirmed live during load testing: a crafted query string to an
// export endpoint reliably killed the whole server this way.)
//
// Wrapping every async handler here means a thrown/rejected error always
// reaches the same generic error middleware (src/app.js) as a synchronous
// one — a clean 500 JSON response to that one request, nothing else
// affected — instead of silently hanging or bringing the process down.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
