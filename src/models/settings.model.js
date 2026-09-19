const records = require('../db/records');
const defaults = {
  id:'clinic', clinicName:'Ceram Dental', phone:'+973 1713 1123', email:'hello@ceram-dental.com',
  address:'Highway 35, New Zinj, Manama, Bahrain', hours:'Sat–Thu, 9:00 AM – 7:00 PM',
  whatsapp:'+973 1713 1123', emergencyPhone:'', bookingUrl:'', instagram:'',
  invoicePrefix:'CER', vatNumber:'', paymentTerms:'Due on receipt',
  appointmentBuffer:'15', reminderWindow:'24', defaultCurrency:'BHD'
};
records.register('settings',[defaults]);
async function get() { return { ...defaults, ...((await records.get('settings','clinic')) || {}) }; }
async function updateSettings(patch) {
  return records.transaction(async()=>{
    const data = { ...defaults, ...((await records.get('settings','clinic',true)) || {}) };
    for(const key of ['clinicName','phone','email','address','hours','whatsapp','emergencyPhone','bookingUrl','instagram','invoicePrefix','vatNumber','paymentTerms','appointmentBuffer','reminderWindow','defaultCurrency'])if(typeof patch[key]==='string')data[key]=patch[key].trim().slice(0,300);
    return records.put('settings',data);
  });
}
module.exports={get,updateSettings};
