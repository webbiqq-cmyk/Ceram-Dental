const records = require('../db/records');
const { nextId } = require('../utils/ids');
const jobModel = require('./job.model');

const applications = [];

async function addApplication({ jobId, name, nationality, email, phone, note }) {
  const job = jobModel.jobs.find(j => j.id === jobId);
  const app = { id: nextId('application', 'APP-'), jobId, jobTitle: job ? job.title : jobId, name, nationality: nationality || '', email, phone: phone || '', note: note || '', createdAt: new Date() };
  await records.insert('applications', app);
  return app;
}

records.register('applications', applications);
async function list(options) { return records.list('applications', options); }
module.exports = { list, applications, addApplication };
