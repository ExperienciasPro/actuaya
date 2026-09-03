const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";
async function debug() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  console.log("Total users in production:", users.length);
  const size = JSON.stringify(users).length;
  console.log("Total size in bytes:", size);
}
debug();
