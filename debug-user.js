const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function debug() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  const user = users.find(u => u.email?.toLowerCase() === 'experiencias3@gmail.com');
  console.log("Full user object:", JSON.stringify(user, null, 2));
}
debug().catch(console.error);
