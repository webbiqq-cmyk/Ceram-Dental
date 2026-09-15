const records=require('../db/records');
const {nextId}=require('../utils/ids');
records.register('notifications');
async function notify(role,{type,title,body,relatedId,ownerId}) { return records.insert('notifications',{id:nextId('notification','NTF-'),role,type,title,body:body || '',relatedId:relatedId || '',ownerId:ownerId || null,read:false,createdAt:new Date()}); }

// One rule for who a notification belongs to: the role it was sent to,
// and — when it names an owner — only that person within the role.
//
// Dentists were always owner-scoped (a clinic must never see another
// clinic's cases) and that filter stays at the store, where the index is.
// Lab notifications are role-wide by default (any designer should see
// "new case assigned to design"), but an @mention names one person, and
// without this an "@Sarah, check the margin" would land in every
// designer's bell.
function visibleTo(role,userId) {
  return n => (n.role===role || n.role==='all') && (!n.ownerId || n.ownerId===userId);
}
async function listFor(role,userId) { return (await records.list('notifications',{limit:200,...(role==='dentist'?{ownerId:userId}:{})})).filter(visibleTo(role,userId)); }
async function markRead(id,role,userId) { return records.update('notifications',id,n=>{ if(!visibleTo(role,userId)(n))return null; n.read=true; }); }
async function markAllRead(role,userId) { for(const n of await listFor(role,userId))await markRead(n.id,role,userId); }
module.exports={notify,listFor,markRead,markAllRead};
