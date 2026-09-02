const { nextId } = require('../utils/ids');
const jobModel = require('./job.model');

const applications = [];

function addApplication({ jobId, name, email, phone, note }) {
  const job = jobModel.jobs.find(j => j.id === jobId);
  const app = { id: nextId('application', 'APP-'), jobId, jobTitle: job ? job.title : jobId, name, email, phone: phone || '', note: note || '', createdAt: new Date() };
  applications.unshift(app);
  return app;
}

module.exports = { applications, addApplication };
