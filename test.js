fetch('https://sep490g58sum26-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'nvduong@star66.vn',
    password: 'CargoOps@2026'
  })
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(res => console.log('RESPONSE:', res))
.catch(err => console.error('ERROR:', err));
