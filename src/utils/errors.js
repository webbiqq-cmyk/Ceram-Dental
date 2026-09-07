// A deliberate, user-facing validation/business-rule failure (e.g.
// "Choose a designer to assign this order to.") — as opposed to anything
// else that throws (a DB outage, a real bug), which should surface as the
// app's generic 500 rather than be shown to the client verbatim. Keeps
// src/services/workflow.service.js free of any HTTP-status knowledge
// while still letting controllers tell the two apart.
class WorkflowError extends Error {}

module.exports = { WorkflowError };
