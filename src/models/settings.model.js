const records = require('../db/records');
const defaults = { id:'clinic', clinicName:'Ceram Dental', phone:'+973 1713 1123', email:'hello@ceram-dental.com', address:'Highway 35, New Zinj, Manama, Bahrain', hours:'Sat–Thu, 9:00 AM – 7:00 PM' };
records.register('settings',[defaults]);
async function get() { return await records.get('settings','clinic') || defaults; }
async function updateSettings(patch) {
  return records.transaction(async()=>{
    const data = await records.get('settings','clinic',true) || defaults;
    for(const key of ['clinicName','phone','email','address','hours'])if(typeof patch[key]==='string')data[key]=patch[key].trim().slice(0,300);
    return records.put('settings',data);
  });
}
module.exports={get,updateSettings};
