function ok(res, extra) { res.json(Object.assign({ ok: true }, extra)); }
function bad(res, message) { res.status(400).json({ ok: false, error: message }); }

module.exports = { ok, bad };
