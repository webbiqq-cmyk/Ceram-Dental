const { ok, bad } = require('../utils/respond');
const teamModel = require('../models/team.model');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const member = await teamModel.addTeamMember(req.body || {});
  if (!member) return bad(res, 'Name is required.');
  await logAction(req, 'team:add', member.name);
  ok(res, { member });
}

async function update(req, res) {
  const body = req.body || {};
  if ('photo' in body && typeof body.photo === 'string' && body.photo.length > 92160) {
    return bad(res, 'That image is too large — use a smaller photo.');
  }
  const member = await teamModel.updateTeamMember(req.params.id, body);
  if (!member) return bad(res, 'Could not update that team member.');
  await logAction(req, 'team:update', member.name);
  ok(res, { member });
}

async function remove(req, res) {
  const removed = await teamModel.removeTeamMember(req.params.id);
  if (!removed) return bad(res, 'Team member not found.');
  await logAction(req, 'team:remove', req.params.id);
  ok(res, { removed: true });
}

module.exports = { create, update, remove };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
