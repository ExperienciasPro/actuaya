const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function debug() {
  const dummyData = "x".repeat(70000); // 70KB string
  console.log("Start POST large:", new Date().toISOString());
  const res = await fetch(`${apiUrl}/data?key=_bulk`, { 
    method: 'POST',
    headers: { 'X-Auth-Token': authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_large_key: dummyData })
  });
  const data = await res.json();
  console.log("End POST large:", new Date().toISOString(), data);
}
debug();
