const {pool,query}=require('../db/pool');
const store=new Map();
const RETENTION_MS=86400000;
async function begin(routeTag,callerId,key,fingerprint='') {
  const scope=require('node:crypto').createHash('sha256').update(JSON.stringify([routeTag,callerId,key])).digest('hex');
  if(pool){
    await query('DELETE FROM idempotency_keys WHERE key=$1 AND expires_at<=now()',[scope]);
    const inserted=await query('INSERT INTO idempotency_keys(key,fingerprint) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING key',[scope,fingerprint]);
    const existing=inserted.rowCount?null:(await query('SELECT * FROM idempotency_keys WHERE key=$1',[scope])).rows[0];
    return {key:scope,existing:existing && {status:existing.status_code?'done':'pending',statusCode:existing.status_code,body:existing.body,fingerprint:existing.fingerprint}};
  }
  const now=Date.now();for(const [k,v]of store)if(v.at<now-RETENTION_MS)store.delete(k);
  const existing=store.get(scope);if(existing)return {key:scope,existing};
  if(store.size>=10000)throw Object.assign(new Error('Retry storage is full.'),{status:503});
  store.set(scope,{status:'pending',at:now,fingerprint});return {key:scope,existing:null};
}
async function complete(key,statusCode,body) {
  if(pool)return query('UPDATE idempotency_keys SET status_code=$2,body=$3 WHERE key=$1',[key,statusCode,body]);
  store.set(key,{...store.get(key),status:'done',statusCode,body,at:Date.now()});
}
async function abandon(key){if(pool)await query('DELETE FROM idempotency_keys WHERE key=$1',[key]);else store.delete(key);}
module.exports={begin,complete,abandon};
