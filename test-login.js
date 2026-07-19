fetch('https://streamflix-backend-production-dd15.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: "admin", password: "admin123" })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Text:", await r.text());
}).catch(console.error);
