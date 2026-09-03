const crypto = require('crypto');
const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function check() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  const user = users.find(u => u.email?.toLowerCase().trim() === 'pezkaisa99@gmail.com');
  console.log("User:", user);
  
  const password = "123456";
  const salt = "AcY_2026";
  const hash = crypto.createHash('sha256').update(password + ':' + salt).digest('hex');
  const expectedHash = `sha256$${hash}`;
  console.log("Expected hash for 123456:", expectedHash);
}
check().catch(console.error);
