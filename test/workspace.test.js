const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function load(file,names,context={}) {
  const source=fs.readFileSync(file,'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
  return vm.runInNewContext(source+'\n({'+names.join(',')+'})',{...context});
}
test('Administration stays independent from the lab workspace',()=>{
  const {workspaceShell}=load('public/js/components/workspace.js',['workspaceShell'],{DATA:{auth:{admin:true,lab:true}},UI:{portalTab:'overview'}});
  const admin=workspaceShell('admin','<h1>Administration</h1>');
  assert.match(admin,/administration-content/);assert.doesNotMatch(admin,/Lab workspace|Lab overview|workspace-sidebar/);
  assert.doesNotMatch(workspaceShell('studio','Lab overview'),/#\/admin|Administration/);
});
test('a staff workspace lists only the signed-in role navigation',()=>{
  const {workspaceShell}=load('public/js/components/workspace.js',['workspaceShell'],{DATA:{auth:{technician:true}},UI:{}});
  const html=workspaceShell('technician','Queue');
  assert.match(html,/#\/technician/);assert.doesNotMatch(html,/#\/reception|#\/designer|#\/qc|#\/admin/);
});
test('one-step timeline omits doctor review and final veneer starts at handoff',()=>{
  const {stageTrackerHtml}=load('public/js/utils/workflow.js',['stageTrackerHtml']);
  const one=stageTrackerHtml({jobType:'crowns',stageType:'final',status:'qc_pending'});
  assert.doesNotMatch(one,/>Review<|>Approved</);assert.match(one,/aria-current="step"[^]*>QC</);
  const final=stageTrackerHtml({jobType:'veneers',stageType:'final',status:'doctor_approved'});
  assert.match(final,/Final production/);assert.match(final,/aria-current="step"[^]*>Handoff</);
});
