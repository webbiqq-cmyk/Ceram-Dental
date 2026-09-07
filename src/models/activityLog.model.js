const records = require('../db/records');
const {nextId} = require('../utils/ids');
records.register('activity');
async function log({role,username,name,action,detail}) { return records.insert('activity',{id:nextId('activity','ACT-'),role,username,name:name || username,action,detail:detail || '',at:new Date()}); }
async function list({username,role,from,to,limit=200}={}) { return (await records.list('activity',{limit:Math.min(Number(limit)||200,1000)})).filter(e=>(!username || e.username===username)&&(!role || e.role===role)&&(!from || new Date(e.at)>=new Date(from))&&(!to || new Date(e.at)<=new Date(to))); }
module.exports={log,list};
