const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./helpers/testApp');
const {pool}=require('../src/db/pool');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const crypto=require('node:crypto');
test('PostgreSQL records and session revocation cross process boundaries',{skip:!pool},async()=>{
  const records=require('../src/db/records'),auth=require('../src/services/auth.service');
  const id=crypto.randomUUID();
  await records.insert('messages',{id,message:'Persistence probe'});
  const user=await require('../src/models/user.model').createUser({username:'persist-'+id,passwordHash:await auth.hashPassword('Temporary-Test-Password'),role:'dentist',name:'Persistence test'});
  const {token}=await auth.issueToken(user);
  const {stdout}=await promisify(execFile)(process.execPath,[require.resolve('./helpers/persistenceChild')],{env:{...process.env,TEST_RECORD_ID:id,TEST_SESSION_TOKEN:token}});
  assert.match(stdout,/verified/);
  assert.equal(await auth.verifyToken(token),null);
});
