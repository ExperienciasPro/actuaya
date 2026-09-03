const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";
async function debug() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  const u = users.find(u => u.email?.toLowerCase() === 'pezkaisa99@gmail.com');
  console.log(JSON.stringify(u, null, 2));
}
debug();
