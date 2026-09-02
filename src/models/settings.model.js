let settings = {
  clinicName: 'Ceram Dental',
  phone: '+973 1713 1123',
  email: 'hello@ceram-dental.com',
  address: 'Highway 35, New Zinj, Manama, Bahrain',
  hours: 'Sat–Thu, 9:00 AM – 7:00 PM'
};

function updateSettings(patch) {
  settings = Object.assign({}, settings, patch);
  return settings;
}

module.exports = {
  get settings() { return settings; },
  updateSettings
};
