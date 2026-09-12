const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.CLOUDINARY_CLOUD_NAME='preview-test';
process.env.CLOUDINARY_API_KEY='test-key';
process.env.CLOUDINARY_API_SECRET='test-secret';
const {downloadLink}=require('../src/utils/filePolicy');
const file=ext=>({public_id:'ceram-dental/cases/test/image',url:'https://res.cloudinary.com/preview-test/image/authenticated/v1/ceram-dental/cases/test/image.'+ext});
test('image previews remain authenticated and expire within five minutes',()=>{
  const result=downloadLink(file('jpg'));
  const preview=new URL(result.preview_url), download=new URL(result.url);
  assert.equal(preview.hostname,'api.cloudinary.com');
  assert.equal(preview.searchParams.get('type'),'authenticated');
  assert.equal(preview.searchParams.get('attachment'),'false');
  assert.equal(download.searchParams.get('attachment'),'true');
  assert.ok(preview.searchParams.get('signature'));
  const remaining=Number(preview.searchParams.get('expires_at'))-Math.floor(Date.now()/1000);
  assert.ok(remaining>0 && remaining<=300);
});
test('PDF and SVG files do not receive inline image previews',()=>{
  for(const ext of ['pdf','svg']){
    const result=downloadLink(file(ext));
    assert.equal(result.preview_url,'');
    assert.ok(result.url);
  }
});
