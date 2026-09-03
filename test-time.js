const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function debug() {
  console.log("Start fetch at", new Date().toISOString());
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  console.log("Headers received at", new Date().toISOString());
  const users = await res.json();
  console.log("Body read at", new Date().toISOString());
}
debug().catch(console.error);
