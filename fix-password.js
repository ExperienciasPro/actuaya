const crypto = require('crypto');
const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function fix() {
  // 1. Get current users
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  
  // 2. Find user and set password
  const idx = users.findIndex(u => u.email?.toLowerCase() === 'experiencias3@gmail.com');
  if (idx === -1) { console.log("User not found!"); return; }
  
  const password = "gonzalete73";
  const salt = "AcY_2026";
  const hash = crypto.createHash('sha256').update(password + ':' + salt).digest('hex');
  users[idx].password = `sha256$${hash}`;
  users[idx].updatedAt = new Date().toISOString();
  
  console.log("Setting password hash:", users[idx].password);
  
  // 3. Save back
  const saveRes = await fetch(`${apiUrl}/data?key=_bulk`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
    body: JSON.stringify({ um_users: users })
  });
  const result = await saveRes.json();
  console.log("Save result:", JSON.stringify(result));
  
  // 4. Verify
  const verify = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const verifyUsers = await verify.json();
  const verifyUser = verifyUsers.find(u => u.email?.toLowerCase() === 'experiencias3@gmail.com');
  console.log("Verified password:", verifyUser?.password);
}
fix().catch(console.error);
