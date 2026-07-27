const https = require('https');

const API_URL = 'https://api.actuaya.co/api/data?key=um_menu_items_sa-001';
const TOKEN = 'cada38hydf';

https.get(API_URL, { headers: { 'X-Auth-Token': TOKEN } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    let items = JSON.parse(data);
    const before = items.length;
    items = items.filter(i => !i.name.toLowerCase().includes('ensalada'));
    console.log(`Removed ${before - items.length} items`);
    
    if (before !== items.length) {
      const payload = JSON.stringify({ "um_menu_items_sa-001": items });
      const req = https.request('https://api.actuaya.co/api/data?key=_bulk', {
        method: 'POST',
        headers: {
          'X-Auth-Token': TOKEN,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          console.log('Update response:', data2);
        });
      });
      req.write(payload);
      req.end();
    }
  });
});
