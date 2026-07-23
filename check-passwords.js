const apiUrl = "https://api.actuaya.co/api";
const authToken = "cada38hydf";

async function check() {
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  const users = await res.json();
  
  let withPassword = 0;
  let withoutPassword = 0;
  const missing = [];
  
  for (const u of users) {
    if (u.isDeleted) continue;
    if (u.password) {
      withPassword++;
    } else {
      withoutPassword++;
      missing.push({ id: u.id, name: u.name, email: u.email });
    }
  }
  
  console.log(`Total usuarios activos: ${withPassword + withoutPassword}`);
  console.log(`Con contraseña: ${withPassword}`);
  console.log(`SIN contraseña: ${withoutPassword}`);
  if (missing.length > 0) {
    console.log("\nUsuarios SIN contraseña:");
    missing.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.id}]`));
  }
}
check().catch(console.error);
