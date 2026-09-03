const { ok, bad } = require('../utils/respond');
const teamModel = require('../models/team.model');
const { logAction } = require('../utils/audit');

function create(req, res) {
  const { name, role } = req.body || {};
  if (!name) return bad(res, 'Name is required.');
  const member = teamModel.addTeamMember({ name, role });
  logAction(req, 'team:add', member.name);
  ok(res, { member });
}

module.exports = { create };
