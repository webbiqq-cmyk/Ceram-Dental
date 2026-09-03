// Sequential ID generator for demo records. Each entity keeps its own running
// counter so seeded data and newly-created records never collide.
const seq = { case: 105, invoice: 105, order: 41, application: 12, message: 30, expense: 9, appointment: 21, team: 5, enquiry: 48, activity: 1, notification: 1 };

function nextId(kind, prefix) {
  return prefix + (seq[kind]++);
}

module.exports = { nextId };
