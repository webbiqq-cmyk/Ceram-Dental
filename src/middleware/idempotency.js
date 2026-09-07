const crypto=require('node:crypto');
const model=require('../models/idempotency.model');
const {asyncHandler}=require('../utils/asyncHandler');
function idempotent(routeTag){return asyncHandler(async(req,res,next)=>{
  const key=req.get('Idempotency-Key');if(!key)return next();
  if(!/^[\w.:-]{1,128}$/.test(key))return res.status(400).json({ok:false,error:'Invalid Idempotency-Key.'});
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
  const caller=req.user?.sub || req.ip;
  const result=await model.begin(routeTag+':'+req.path,caller,key,fingerprint);
  if(result.existing){
    if(result.existing.fingerprint!==fingerprint)return res.status(409).json({ok:false,error:'Idempotency-Key was used with different input.'});
    if(result.existing.status==='pending')return res.status(409).json({ok:false,error:'Request is already being processed.'});
    return res.status(result.existing.statusCode).json(result.existing.body);
  }
  req.pendingIdempotencyKey=result.key;
  const json=res.json.bind(res);
  res.json=body=>{
    const work=res.statusCode<400 ? model.complete(result.key,res.statusCode,body) : model.abandon(result.key);
    work.then(()=>json(body)).catch(next);
    return res;
  };
  next();
});}
module.exports={idempotent};
