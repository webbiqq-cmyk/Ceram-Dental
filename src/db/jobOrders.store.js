// Picks the lab workflow's storage backend once, at boot: real Postgres
// (jobOrders.repo.js) when DATABASE_URL is set, an in-memory store
// (jobOrders.memory.js) when it isn't — so the system works immediately
// on a fresh deployment with no setup step, and upgrades to real
// persistence the moment DATABASE_URL is added, with no code change
// anywhere else. src/services/workflow.service.js and
// src/controllers/orders.controller.js import this, never the two
// backends directly.
module.exports = process.env.DATABASE_URL
  ? require('./jobOrders.repo')
  : require('./jobOrders.memory');
