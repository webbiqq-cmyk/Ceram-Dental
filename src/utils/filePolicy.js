const {WorkflowError}=require('./errors');
const CATEGORIES=['scan','photo','design_file','instruction','qc_photo','other'];
function validateFile(orderId,{url,publicId,version,signature,stageType,category}){
  let parsed;try{parsed=new URL(url);}catch{throw new WorkflowError('Invalid file URL.');}
  const cloud=process.env.CLOUDINARY_CLOUD_NAME;
  if(!cloud || parsed.protocol!=='https:' || parsed.hostname!=='res.cloudinary.com' || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.startsWith('/'+cloud+'/'))throw new WorkflowError('Use the configured secure upload service.');
  if(typeof publicId!=='string' || !publicId.startsWith('ceram-dental/cases/'+orderId+'/') || !/^[A-Za-z0-9/_.-]{1,250}$/.test(publicId))throw new WorkflowError('File does not belong to this order.');
  const {cloudinary}=require('../config/cloudinary');
  if(!Number.isInteger(version) || typeof signature!=='string' || !cloudinary.utils.verify_api_response_signature(publicId,version,signature))throw new WorkflowError('Invalid upload receipt.');
  if(!/^\/[^/]+\/(image|raw)\/authenticated\//.test(parsed.pathname))throw new WorkflowError('Case files must use authenticated storage.');
  const asset=decodeURIComponent(parsed.pathname).split('/v'+version+'/')[1];
  if(!asset || (asset!==publicId && !asset.startsWith(publicId+'.')))throw new WorkflowError('Upload URL does not match its receipt.');
  if(!['demo','final'].includes(stageType || 'final') || !CATEGORIES.includes(category || 'other'))throw new WorkflowError('Invalid file category or stage.');
}
function downloadLink(file){
  const {cloudinary,isConfigured}=require('../config/cloudinary');
  if(!isConfigured)return {...file,url:''};
  const match=/\/(image|raw)\/authenticated\/(?:s--[A-Za-z0-9_-]+--\/)?v[0-9]+\/.+\.([a-z0-9]+)$/i.exec(file.url || '');
  if(!match)return {...file,url:''};
  const options={resource_type:match[1],type:'authenticated',expires_at:Math.floor(Date.now()/1000)+300};
  const previewable=match[1]==='image' && /^(jpe?g|png|webp|gif|avif)$/i.test(match[2]);
  return {...file,url:cloudinary.utils.private_download_url(file.public_id,match[2],{...options,attachment:true}),
    preview_url:previewable ? cloudinary.utils.private_download_url(file.public_id,match[2],{...options,attachment:false}) : ''};
}
module.exports={validateFile,downloadLink};
