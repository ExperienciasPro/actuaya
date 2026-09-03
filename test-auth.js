const crypto = require('crypto');
async function hashPassword(plain) {
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  return `sha256$${hash}`;
}

async function run() {
  const res = await fetch('https://api.actuaya.co/api/data?key=um_users', { headers: { 'X-Auth-Token': 'cada38hydf' } });
  const users = await res.json();
  const identifier = "pezkaisa99@gmail.com";
  let user = users.find(u => u.email?.toLowerCase() === identifier.toLowerCase() && u.isActive);
  
  if (!user) {
    console.log("User not found or inactive");
    return;
  }
  console.log("User found:", user.email);
  // Wait, I don't have her plain password!
  // But I can check if the hash matches... wait, the backend has the hashed password!
}
run();
