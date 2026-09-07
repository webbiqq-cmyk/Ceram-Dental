const { randomUUID } = require('node:crypto');
function nextId(kind, prefix) { return prefix + randomUUID(); }
module.exports = { nextId };
