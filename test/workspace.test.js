const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,names,context={}) {
  const source=fs.readFileSync(file,'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
  return vm.runInNewContext(source+'\n({'+names.join(',')+'})',{...context});
}
test('Administration is its own surface, not nested in the lab workspace',()=>{
  const ADMIN_TABS=[['overview','Overview'],['enquiries','Enquiries'],['orders','Case Tracking & Orders']];
  const {workspaceShell}=load('public/js/components/workspace.js',['workspaceShell'],
    {DATA:{auth:{admin:true,lab:true},summary:{},applications:[],messages:[]},UI:{adminTab:'overview'},ADMIN_TABS});
  const admin=workspaceShell('admin','<h1>Administration</h1>');
  // its own nav and brand, never the lab's
  assert.match(admin,/data-admin-tab="overview"/);
  assert.match(admin,/CERAM<small>Administration/);
  assert.doesNotMatch(admin,/Lab overview|Lab workspace|#\/reception|#\/designer|#\/studio/);
  // and the lab studio shell never links back into admin
  assert.doesNotMatch(workspaceShell('studio','Lab overview'),/#\/admin|>Administration</);
});
test('a lab station shows only its own nav; the manager sees every station',()=>{
  const {workspaceShell}=load('public/js/components/workspace.js',['workspaceShell'],{DATA:{auth:{}},UI:{labRole:'technician'}});
  const station=workspaceShell('technician','Queue');
  const stationNav=station.slice(station.indexOf('<nav'),station.indexOf('</nav>'));
  assert.match(stationNav,/href="#\/technician"/);
  assert.doesNotMatch(stationNav,/#\/reception|#\/designer|#\/qc|#\/admin/);
  assert.match(station,/data-lab-signout/);

  const {workspaceShell:shell2}=load('public/js/components/workspace.js',['workspaceShell'],{DATA:{auth:{}},UI:{labRole:'manager'}});
  const mgr=shell2('studio','Board');
  ['reception','designer','technician','qc'].forEach(p=>assert.match(mgr,new RegExp('href="#/'+p+'"')));

  // the pre-sign-in picker renders without a sidebar
  const {workspaceShell:shell3}=load('public/js/components/workspace.js',['workspaceShell'],{DATA:{auth:{}},UI:{labRole:''}});
  assert.doesNotMatch(shell3('studio','Pick a role'),/workspace-sidebar/);
});
test('one-step timeline omits doctor review and final veneer starts at handoff',()=>{
  const {stageTrackerHtml}=load('public/js/utils/workflow.js',['stageTrackerHtml']);
  const one=stageTrackerHtml({jobType:'crowns',stageType:'final',status:'qc_pending'});
  assert.doesNotMatch(one,/>Review<|>Approved</);assert.match(one,/aria-current="step"[^]*>QC</);
  const final=stageTrackerHtml({jobType:'veneers',stageType:'final',status:'doctor_approved'});
  assert.match(final,/Final production/);assert.match(final,/aria-current="step"[^]*>Handoff</);
});
