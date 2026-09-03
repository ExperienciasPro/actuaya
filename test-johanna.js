const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function debug() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  const matches = users.filter(u => u.email?.toLowerCase() === 'pezkaisa99@gmail.com');
  console.log("Found matches:", matches.length);
  matches.forEach(m => console.log(m.id, m.name, m.isActive, m.isDeleted, m.password));
}
debug().catch(console.error);
