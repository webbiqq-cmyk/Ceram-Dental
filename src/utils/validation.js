function text(value, label, max=200, required=false) {
  if(value==null && !required)return '';
  if(typeof value!=='string' || value.length>max || (required && !value.trim()))throw Object.assign(new Error(label+' is invalid.'),{status:400,expose:true});
  return value.trim();
}
function validateBody(req,res,next) {
  try {
    if(!req.body)return next();
    if(Array.isArray(req.body) || typeof req.body!=='object')throw Object.assign(new Error('Expected an object.'),{status:400,expose:true});
    const fields={name:120,username:100,email:254,phone:40,nationality:80,message:4000,note:4000,instructions:4000,patient:120,patientRef:120,clinic:200,service:80,jobId:80,jobType:80,shade:40,description:2000,category:80,handle:120,channel:80,body:4000,stage:80,status:80,decision:30,designerId:80,technicianId:80,qcId:80,scanBody:100,implantSystem:100,abutmentSize:80,deliveryMethod:40};
    for(const [key,max] of Object.entries(fields))if(req.body[key]!==undefined)req.body[key]=text(req.body[key],key,max);
    for(const key of ['password','newPassword','currentPassword'])if(req.body[key]!==undefined && (typeof req.body[key]!=='string' || Buffer.byteLength(req.body[key])>72))throw Object.assign(new Error('Password must be at most 72 bytes.'),{status:400,expose:true});
    if(req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email))throw Object.assign(new Error('Email is invalid.'),{status:400,expose:true});
    if(req.body.preferredDate && (typeof req.body.preferredDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.preferredDate) || !Number.isFinite(Date.parse(req.body.preferredDate))))throw Object.assign(new Error('Preferred date is invalid.'),{status:400,expose:true});
    if(req.body.customer!==undefined){const c=req.body.customer;if(!c || typeof c!=='object' || Array.isArray(c))throw Object.assign(new Error('Customer is invalid.'),{status:400,expose:true});req.body.customer={name:text(c.name,'Customer name',120,true),email:text(c.email,'Customer email',254),phone:text(c.phone,'Customer phone',40),address:text(c.address,'Customer address',400),note:text(c.note,'Customer note',1000)};}
    for(const key of ['active','remember'])if(req.body[key]!==undefined && typeof req.body[key]!=='boolean')throw Object.assign(new Error(key+' must be a boolean.'),{status:400,expose:true});
    next();
  }catch(e){next(e);}
}
module.exports={text,validateBody};
