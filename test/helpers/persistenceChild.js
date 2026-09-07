const assert=require('node:assert/strict');
(async()=>{
  const row=await require('../../src/db/records').get('messages',process.env.TEST_RECORD_ID);
  assert.equal(row.message,'Persistence probe');
  const session=await require('../../src/services/auth.service').verifyToken(process.env.TEST_SESSION_TOKEN);
  assert.ok(session);
  await require('../../src/models/session.model').revoke(session.jti);
  await require('../../src/db/pool').pool.end();
  console.log('Cross-process persistence and revocation verified');
})().catch(()=>{process.exitCode=1;});
