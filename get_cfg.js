const https = require('https');
https.get('https://api.actuaya.co/api/data?key=um_menu_config_sa-001', { headers: { 'X-Auth-Token': 'cada38hydf' } }, res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => console.log(d));
});
