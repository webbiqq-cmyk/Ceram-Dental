const {pool,query}=require('../src/db/pool');
async function run(){
  if(!pool)throw new Error('DATABASE_URL is required.');
  await query('DELETE FROM sessions WHERE expires_at<=now()');
  await query('DELETE FROM idempotency_keys WHERE expires_at<=now()');
  await query('DELETE FROM rate_limits WHERE reset_at<=now()');
  // Clinical/business records are never deleted automatically.
  console.log('Expired session, retry and rate-limit records removed.');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool?.end());
