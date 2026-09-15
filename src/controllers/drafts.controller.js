const { ok } = require('../utils/respond');
const { asyncHandler } = require('../utils/asyncHandler');
const service = require('../services/drafts.service');

// Every handler scopes to req.user.sub. A draft belongs to the dentist who
// started it and to nobody else — there is no "draft id" a caller can pass
// to reach another clinic's work, because the id is always checked against
// the authenticated owner in the model.
const owner = req => req.user.sub;

async function list(req, res) { ok(res, { drafts: await service.list(owner(req)) }); }
async function detail(req, res) { ok(res, { draft: await service.get(req.params.id, owner(req)) }); }
async function create(req, res) { ok(res, { draft: await service.create(owner(req), (req.body || {}).payload) }); }
async function save(req, res) { ok(res, { draft: await service.save(req.params.id, owner(req), (req.body || {}).payload) }); }
async function remove(req, res) { await service.remove(req.params.id, owner(req)); ok(res); }
async function duplicate(req, res) { ok(res, { draft: await service.duplicate(req.params.id, owner(req)) }); }

module.exports = { list, detail, create, save, remove, duplicate };
for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = asyncHandler(handler);
