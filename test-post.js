const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";
async function debug() {
  console.log("Start POST:", new Date().toISOString());
  const res = await fetch(`${apiUrl}/data?key=_bulk`, { 
    method: 'POST',
    headers: { 'X-Auth-Token': authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_key: 'test_value' })
  });
  const data = await res.json();
  console.log("End POST:", new Date().toISOString(), data);
}
debug();
