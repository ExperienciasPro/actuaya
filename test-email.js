const authToken = "cada38hydf";
const apiUrl = "https://api.actuaya.co/api";
const emailToTest = "experiencias3@gmail.com";

async function runTest() {
  console.log("1. Buscando lista de usuarios en producción...");
  const res = await fetch(`${apiUrl}/data?key=um_users`, { headers: { 'X-Auth-Token': authToken } });
  let users = await res.json();
  if (!Array.isArray(users)) users = [];
  
  let user = users.find(u => u.email && u.email.toLowerCase() === emailToTest.toLowerCase());
  if (!user) {
    console.log(`2. El usuario no existe. Creando usuario de prueba: ${emailToTest}...`);
    user = {
      id: "test-" + Date.now(),
      name: "Usuario de Prueba",
      email: emailToTest,
      password: "sha256$dummyhash",
      createdAt: new Date().toISOString(),
      isDeleted: false
    };
    users.push(user);
    
    console.log("3. Guardando usuario en producción...");
    await fetch(`${apiUrl}/data?key=_bulk`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
      body: JSON.stringify({ um_users: users })
    });
    console.log("   Usuario guardado.");
  } else {
    console.log(`2. El usuario ya existe (ID: ${user.id}).`);
  }
  
  console.log("4. Disparando endpoint de forgot-password...");
  const resForgot = await fetch(`${apiUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
    body: JSON.stringify({ email: emailToTest })
  });
  
  const textForgot = await resForgot.text();
  console.log("5. Respuesta del servidor:");
  console.log(textForgot);
}

runTest().catch(console.error);
