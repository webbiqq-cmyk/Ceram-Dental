const records=require('../db/records');
const {nextId}=require('../utils/ids');
records.register('notifications');
async function notify(role,{type,title,body,relatedId,ownerId}) { return records.insert('notifications',{id:nextId('notification','NTF-'),role,type,title,body:body || '',relatedId:relatedId || '',ownerId:ownerId || null,read:false,createdAt:new Date()}); }
async function listFor(role,userId) { return (await records.list('notifications',{limit:200,...(role==='dentist'?{ownerId:userId}:{})})).filter(n=>n.role===role || n.role==='all'); }
async function markRead(id,role,userId) { return records.update('notifications',id,n=>{ if((n.role!==role && n.role!=='all') || (role==='dentist' && n.ownerId!==userId))return null; n.read=true; }); }
async function markAllRead(role,userId) { for(const n of await listFor(role,userId))await markRead(n.id,role,userId); }
module.exports={notify,listFor,markRead,markAllRead};
