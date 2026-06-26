async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vinhquang.vn', password: 'Admin@CargoOps2026' })
    });
    const loginData = await loginRes.json();
    console.log("Login status:", loginRes.status);
    console.log("Token:", loginData.token ? loginData.token.substring(0, 20) + "..." : "No token");

    // 2. Fetch cargo-types
    const res = await fetch('http://localhost:5000/api/cargo-types', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const data = await res.json();
    console.log("Fetch cargo-types status:", res.status);
    console.log("Data:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
