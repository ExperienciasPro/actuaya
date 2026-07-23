const crypto = require('crypto');
const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function debug() {
  // 1. Get stored hash from server
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  const user = users.find(u => u.email?.toLowerCase() === 'experiencias3@gmail.com');
  console.log("Stored password hash:", user?.password);
  
  // 2. Generate hash the same way backend does it
  const password = "gonzalete73";
  const salt = "AcY_2026";
  const backendHash = crypto.createHash('sha256').update(password + ':' + salt).digest('hex');
  console.log("Backend would generate:", `sha256$${backendHash}`);
  
  // 3. Generate hash the way frontend does it (TextEncoder + crypto.subtle)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const frontendHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log("Frontend would generate:", `sha256$${frontendHash}`);
  
  console.log("\nMatch?", backendHash === frontendHash);
}
debug().catch(console.error);
