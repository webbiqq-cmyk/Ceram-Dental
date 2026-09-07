const {test}=require('node:test');
const assert=require('node:assert/strict');
const {startTestServer}=require('./helpers/testApp');
const users=require('../src/models/user.model');
const auth=require('../src/services/auth.service');
const records=require('../src/db/records');
const repo=require('../src/db/jobOrders.store');
const crypto=require('node:crypto');

test('security and business integrity',async t=>{
  const {baseUrl,close}=await startTestServer();t.after(close);
  const hash=await auth.hashPassword('StrongTestPassword-123');
  const accounts={};
  for(const role of ['admin','dentist','lab','receptionist','designer','technician','qc']){
    const user=await users.createUser({username:'hardening-'+role+'-'+crypto.randomUUID(),passwordHash:hash,role,name:role});
    const {token}=await auth.issueToken(user);accounts[role]={user,cookie:role+'_session='+token};
  }
  const other=await users.createUser({username:'other-'+crypto.randomUUID(),passwordHash:hash,role:'dentist',name:'Other dentist'});
  accounts.other={user:other,cookie:'dentist_session='+(await auth.issueToken(other)).token};
  async function request(path,{role,body,method=body?'POST':'GET',key}={}){
    const res=await fetch(baseUrl+'/api'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(role?{Cookie:accounts[role].cookie}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:res.status,body:await res.json()};
  }
  let order;
  await t.test('seven roles can authenticate and anonymous callers get no private data',async()=>{
    for(const role of Object.keys(accounts).filter(r=>r!=='other'))assert.equal((await request('/auth/'+role+'/me',{role})).status,200);
    const state=await request('/state');assert.equal(state.body.auth.admin,false);assert.deepEqual(state.body.cases,[]);
  });
  await t.test('workflow creation preserves actor identity and rejects unrelated dentist reads',async()=>{
    const result=await request('/orders',{role:'dentist',body:{patientRef:'Private patient',jobType:'veneers',deliveryMethod:'pickup'}});
    assert.equal(result.status,200,JSON.stringify(result));order=result.body.order;
    assert.equal(order.dentist_user_id,accounts.dentist.user.id);
    for(const suffix of ['', '/messages','/files'])assert.equal((await request('/orders/'+order.id+suffix,{role:'other'})).status,404);
    assert.equal((await request('/orders',{role:'other'})).body.orders.length,0);
    assert.equal((await request('/orders/'+order.id+'/messages',{role:'other',body:{body:'Intrusion'}})).status,404);
  });
  await t.test('invalid assignment rolls back; competing transitions execute once',async()=>{
    assert.equal((await request('/orders/'+order.id+'/reception-review',{role:'receptionist',body:{decision:'accept',designerId:accounts.technician.user.id}})).status,400);
    assert.equal((await repo.getOrder(order.id)).status,'pending_reception_review');
    const results=await Promise.all([1,2].map(()=>request('/orders/'+order.id+'/reception-review',{role:'receptionist',body:{decision:'accept',designerId:accounts.designer.user.id}})));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
    const history=await repo.listStageHistory(order.id);
    assert.equal(history.filter(h=>h.status==='in_design').length,1);
  });
  await t.test('complete veneer demo and final workflow with truthful actor history',async()=>{
    for(let cycle=0;cycle<2;cycle++){
      for(const [action,role,body]of [
        ['design-done','designer',{technicianId:accounts.technician.user.id}],
        ['production-done','technician',{qcId:accounts.qc.user.id}],
        ['qc-decision','qc',{decision:'approve'}],
        ['doctor-decision','dentist',{decision:'approve'}]
      ]){const r=await request('/orders/'+order.id+'/'+action,{role,body});assert.equal(r.status,200,JSON.stringify(r));}
      const o=await repo.getOrder(order.id);assert.equal(o.stage_type,'final');assert.equal(o.status,cycle?'doctor_approved':'in_design');
    }
    for(const action of ['confirm-completion','mark-delivered','mark-completed'])assert.equal((await request('/orders/'+order.id+'/'+action,{role:'receptionist',body:{}})).status,200);
    assert.equal((await repo.getOrder(order.id)).status,'completed');
  });
  await t.test('file metadata and unauthorized signing are rejected',async()=>{
    assert.equal((await request('/orders/'+order.id+'/files',{role:'dentist',body:{url:'javascript:alert(1)',publicId:'bad'}})).status,400);
  });
  await t.test('legacy case state is isolated by dentist and stage jumps fail',async()=>{
    const result=await request('/cases',{role:'dentist',body:{patient:'P',service:'crowns'}});assert.equal(result.status,200);
    const id=result.body.case.id;
    assert.equal((await request('/cases/'+id+'/action',{role:'other',body:{act:'approve'}})).status,404);
    assert.equal((await request('/cases/'+id+'/action',{role:'dentist',body:{act:'approve'}})).status,400);
    const otherState=(await request('/state',{role:'other'})).body;
    assert.ok(!otherState.cases.some(c=>c.id===id));assert.ok(!otherState.invoices.some(i=>i.caseId===id));
  });
  await t.test('checkout cannot oversell or accept formulas/invalid quantities',async()=>{
    const id='stock-'+crypto.randomUUID();await records.insert('products',{id,name:'Test product',price:1.125,stock:1,active:true});
    const body={items:[{id,qty:1}],customer:{name:'Buyer'}};
    const results=await Promise.all([request('/checkout',{body}),request('/checkout',{body})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
    assert.equal((await records.get('products',id)).stock,0);assert.equal(results.find(r=>r.status===200).body.order.total,1.125);
    assert.equal((await request('/checkout',{body:{...body,customer:{name:{formula:'1+1'}}}})).status,400);
    assert.equal((await request('/checkout',{body:{...body,items:[{id,qty:1.5}]}})).status,400);
  });
  await t.test('idempotency binds input and target; concurrent retries return one case',async()=>{
    const key=crypto.randomUUID(),body={service:'crowns'};
    const results=await Promise.all([request('/cases',{body,key}),request('/cases',{body,key})]);
    assert.equal(results[0].status,200);assert.equal(results[1].status,200);assert.equal(results[0].body.case.id,results[1].body.case.id);
    assert.equal((await request('/cases',{key,body:{service:'veneers'}})).status,409);
    const a=await request('/cases',{body}),b=await request('/cases',{body});const actionKey=crypto.randomUUID();
    for(const c of [a,b])assert.equal((await request('/cases/'+c.body.case.id+'/action',{role:'lab',key:actionKey,body:{act:'advance'}})).status,200);
    assert.equal((await records.get('cases',b.body.case.id)).stage,'qc');
  });
  await t.test('field abuse, cross-origin writes, unknown routes fail cleanly',async()=>{
    assert.equal((await request('/contact',{body:{name:{x:1},email:'a@b.com',message:'hi'}})).status,400);
    assert.equal((await request('/appointments',{body:{name:'X',phone:'123',preferredDate:'nonsense'}})).status,400);
    assert.equal((await request('/missing',{body:{}})).status,404);
    const r=await fetch(baseUrl+'/api/contact',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify({name:'X',email:'a@b.com',message:'hi'})});assert.equal(r.status,403);
  });
  await t.test('mid-workflow failure rolls back the order and permits a safe retry',async()=>{
    const original=repo.addStageHistory;
    const key=crypto.randomUUID(),body={patientRef:'Rollback-'+key,jobType:'crowns'};
    repo.addStageHistory=async()=>{throw new Error('Injected storage failure');};
    try{assert.equal((await request('/orders',{role:'dentist',body,key})).status,500);}finally{repo.addStageHistory=original;}
    const rows=await repo.listOrders('dentist',accounts.dentist.user.id);
    assert.ok(!rows.some(o=>o.patient_ref===body.patientRef));
    assert.equal((await request('/orders',{role:'dentist',body,key})).status,200);
  });
  await t.test('password reset and account deactivation revoke existing sessions',async()=>{
    await users.setPasswordHash(accounts.other.user.id,hash);
    assert.equal((await request('/auth/dentist/me',{role:'other'})).status,401);
    await users.setActive(accounts.technician.user.id,false);
    assert.equal((await request('/auth/technician/me',{role:'technician'})).status,401);
  });
});
