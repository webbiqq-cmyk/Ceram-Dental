const { ok, bad } = require('../utils/respond');
const teamModel = require('../models/team.model');
const { logAction } = require('../utils/audit');

async function create(req, res) {
  const { name, role } = req.body || {};
  if (!name) return bad(res, 'Name is required.');
  const member = await teamModel.addTeamMember({ name, role });
  await logAction(req, 'team:add', member.name);
  ok(res, { member });
}

module.exports = { create };

for (const [name, handler] of Object.entries(module.exports)) module.exports[name] = require('../utils/asyncHandler').asyncHandler(handler);
