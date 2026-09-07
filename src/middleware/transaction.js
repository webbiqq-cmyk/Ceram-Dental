const records = require('../db/records');
// Do not acknowledge a mutation until its data and retry record commit.
function transactional(req,res,next) {
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const json=res.json.bind(res), send=res.send.bind(res);
  let settled=false;
  records.transaction(()=>new Promise((resolve,reject)=>{
    req.rejectTransaction=reject;
    function capture(kind,body){
      if(settled)return res;
      settled=true;
      if(res.statusCode>=400){const err=new Error('Request rejected');err.response={kind,body,status:res.statusCode};reject(err);}
      else resolve({kind,body});
      return res;
    }
    res.json=body=>capture('json',body);
    res.send=body=>capture('send',body);
    next();
  })).then(result=>{
    res.json=json;res.send=send;delete req.rejectTransaction;
    if(!res.destroyed)res[result.kind](result.body);
  }).catch(async err=>{
    if(req.pendingIdempotencyKey && !require('../db/pool').pool) await require('../models/idempotency.model').abandon(req.pendingIdempotencyKey);
    res.removeHeader('Set-Cookie');
    res.json=json;res.send=send;delete req.rejectTransaction;
    if(err.response){res.status(err.response.status);return res[err.response.kind](err.response.body);}
    const status=Number.isInteger(err.status) && err.status>=400 && err.status<600 ? err.status : 500;
    if(status>=500)console.error('[transaction-error]',err.code || err.name);
    if(!res.destroyed)res.status(status).json({ok:false,error:err.expose?err.message:'Something went wrong.'});
  });
}
module.exports={transactional};
