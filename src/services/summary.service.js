// Dashboard aggregation — reads across models to build the admin overview
// numbers and the revenue sparkline. Nothing here owns data; it only reports.
const { daysAgo } = require('../utils/dates');
const caseModel = require('../models/case.model');
const invoiceModel = require('../models/invoice.model');
const expenseModel = require('../models/expense.model');
const orderModel = require('../models/order.model');
const applicationModel = require('../models/application.model');
const messageModel = require('../models/message.model');
const appointmentModel = require('../models/appointment.model');
const enquiryModel = require('../models/enquiry.model');

async function revenueTrend(days, invoiceRows) {
  days = days || 7;
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    buckets.push({ key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }), total: 0 });
  }
  (invoiceRows || await invoiceModel.list({limit:10000})).filter(inv => inv.status === 'paid' && inv.paidAt).forEach(inv => {
    const key = new Date(inv.paidAt).toDateString();
    const b = buckets.find(x => x.key === key);
    if (b) b.total += inv.amount;
  });
  return buckets.map(b => ({ label: b.label, total: b.total }));
}

async function summary() {
  if (require('../db/pool').pool) return sqlSummary();
  const [invoiceRows,expenseRows,caseRows,orderRows,applicationRows,messageRows,appointmentRows,enquiryRows]=await Promise.all([invoiceModel.list({limit:10000}),expenseModel.list({limit:10000}),caseModel.list({limit:10000}),orderModel.list({limit:10000}),applicationModel.list({limit:10000}),messageModel.list({limit:10000}),appointmentModel.list({limit:10000}),enquiryModel.list({limit:10000})]);
  const invoices = invoiceRows;
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0);
  const activeCases = caseRows.filter(c => c.stage !== 'ready').length;
  const readyCases = caseRows.filter(c => c.stage === 'ready').length;
  const shopRevenue = orderRows.reduce((s, o) => s + o.total, 0);
  const newAppointments = appointmentRows.filter(a => a.status === 'new').length;
  const newEnquiries = enquiryRows.filter(e => e.stage === 'new').length;
  return {
    revenue, outstanding, overdue, totalExpenses,
    net: Math.round((revenue + shopRevenue - totalExpenses) * 100) / 100,
    activeCases, readyCases, shopRevenue,
    openApplications: applicationRows.length,
    newMessages: messageRows.length,
    newAppointments, totalAppointments: appointmentRows.length,
    newEnquiries, totalEnquiries: enquiryRows.length,
    trend: await revenueTrend(7, invoiceRows)
  };
}

module.exports = { summary, revenueTrend };

async function sqlSummary() {
  const {query}=require('../db/pool');
  const {rows}=await query(`SELECT collection,
    count(*)::int AS count,
    coalesce(sum(CASE WHEN collection='invoices' AND data->>'status'='paid' THEN (data->>'amount')::numeric ELSE 0 END),0) AS revenue,
    coalesce(sum(CASE WHEN collection='invoices' AND data->>'status'<>'paid' THEN (data->>'amount')::numeric ELSE 0 END),0) AS outstanding,
    coalesce(sum(CASE WHEN collection='expenses' THEN (data->>'amount')::numeric WHEN collection='orders' THEN (data->>'total')::numeric ELSE 0 END),0) AS total,
    count(*) FILTER(WHERE data->>'status'='overdue')::int AS overdue,
    count(*) FILTER(WHERE data->>'stage'='ready')::int AS ready,
    count(*) FILTER(WHERE data->>'status'='new' OR data->>'stage'='new')::int AS fresh
    FROM app_records WHERE collection=ANY($1) GROUP BY collection`,[['invoices','expenses','cases','orders','applications','messages','appointments','enquiries']]);
  const m=Object.fromEntries(rows.map(r=>[r.collection,r]));
  const n=(c,k)=>Number(m[c]?.[k] || 0);
  const recent=await query("SELECT data FROM app_records WHERE collection='invoices' AND data->>'status'='paid' AND (data->>'paidAt')::timestamptz>=now()-interval '8 days'");
  const revenue=n('invoices','revenue'),outstanding=n('invoices','outstanding'),totalExpenses=n('expenses','total'),shopRevenue=n('orders','total');
  return {revenue,outstanding,totalExpenses,shopRevenue,overdue:n('invoices','overdue'),net:Math.round((revenue+shopRevenue-totalExpenses)*1000)/1000,
    activeCases:n('cases','count')-n('cases','ready'),readyCases:n('cases','ready'),openApplications:n('applications','count'),newMessages:n('messages','count'),
    newAppointments:n('appointments','fresh'),totalAppointments:n('appointments','count'),newEnquiries:n('enquiries','fresh'),totalEnquiries:n('enquiries','count'),trend:await revenueTrend(7,recent.rows.map(r=>r.data))};
}
