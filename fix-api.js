const fs = require('fs');

async function run() {
  const token = 'cada38hydf';
  const url = 'https://api.actuaya.co/api/data?key=um_users';
  
  const res = await fetch(url, { headers: { 'X-Auth-Token': token, 'ngsw-bypass': 'true' } });
  let users = await res.json();
  
  let updated = false;
  for (let u of users) {
    if (u.email === 'perezkaisa99@gmail.com') {
      u.password = 'sha256$4a75ee79208600f57d75a07e7edf791dd7e84d7684495031f81cffadfc5ba791'; // Hash para 123456
      updated = true;
    }
  }
  
  if (updated) {
    const postRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'ngsw-bypass': 'true'
      },
      body: JSON.stringify(users)
    });
    console.log('Update status:', postRes.status);
    console.log(await postRes.text());
  } else {
    console.log('User not found');
  }
}
run();
