// Ceram Dental — demo platform server
//
// One small Express server backing four connected surfaces: the public
// website + shop, the dentist portal, internal Lab Studio, and the
// accounts/admin dashboard. Data lives in memory (see db.js) — this is a
// click-through demo for sign-off, not the production build — so it resets
// whenever the server restarts.

const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ok(res, extra) { res.json(Object.assign({ ok: true }, extra)); }
function bad(res, message) { res.status(400).json({ ok: false, error: message }); }

/* ---------------------------------------------------------------------- */
/* One consolidated read — the client caches this and re-fetches after    */
/* every mutation, instead of wiring up a GET per resource.               */
/* ---------------------------------------------------------------------- */
app.get('/api/state', (req, res) => {
  res.json({
    cases: db.cases,
    invoices: db.invoices,
    expenses: db.expenses,
    products: db.products,
    jobs: db.jobs,
    applications: db.applications,
    messages: db.messages,
    orders: db.orders,
    summary: db.summary()
  });
});

/* ------------------------------- Cases --------------------------------- */
app.post('/api/cases', (req, res) => {
  const { clinic, patient, service, shade, instructions, protocol } = req.body || {};
  if (!service) return bad(res, 'Service is required.');
  const created = db.createCase({ clinic, patient, service, shade, instructions, protocol });
  ok(res, { case: created });
});

app.post('/api/cases/:id/action', (req, res) => {
  const { act } = req.body || {};
  const result = db.actOnCase(req.params.id, act);
  if (!result) return bad(res, 'Unknown case or action.');
  ok(res, { case: result });
});

/* ------------------------------ Invoices -------------------------------- */
app.post('/api/invoices/:id/pay', (req, res) => {
  const inv = db.payInvoice(req.params.id);
  if (!inv) return bad(res, 'Unknown invoice.');
  ok(res, { invoice: inv });
});

/* ------------------------------ Expenses -------------------------------- */
app.post('/api/expenses', (req, res) => {
  const { category, description, amount } = req.body || {};
  if (!category || !amount) return bad(res, 'Category and amount are required.');
  const exp = db.addExpense({ category, description, amount: Number(amount) });
  ok(res, { expense: exp });
});

/* -------------------------------- Shop ---------------------------------- */
app.post('/api/checkout', (req, res) => {
  const { items, customer } = req.body || {};
  if (!items || !items.length) return bad(res, 'Your cart is empty.');
  const order = db.checkout(items, customer || {});
  if (!order) return bad(res, 'Could not place that order.');
  ok(res, { order });
});

/* ------------------------------- Careers -------------------------------- */
app.post('/api/careers/apply', (req, res) => {
  const { jobId, name, email, phone, note } = req.body || {};
  if (!jobId || !name || !email) return bad(res, 'Name, email and role are required.');
  const application = db.addApplication({ jobId, name, email, phone, note });
  ok(res, { application });
});

/* -------------------------------- Contact -------------------------------- */
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) return bad(res, 'Name, email and message are required.');
  const msg = db.addMessage({ name, email, message });
  ok(res, { message: msg });
});

// Vercel imports this file as a serverless function (module.exports = app)
// instead of running it directly, so only listen when run with `node server.js`.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ceram Dental demo running → http://localhost:${PORT}`);
  });
}

module.exports = app;
