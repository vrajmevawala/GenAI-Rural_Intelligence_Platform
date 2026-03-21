# login

## Location
- Source: auth/auth.service.js
- Lines: 68-116

## Signature
```js
login(payload, ipAddress)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Performs authentication/security-related processing.

## Parameters
- payload
- ipAddress

## Implementation Snapshot
```js
async function login(payload, ipAddress) {
  const sql = `
    SELECT id, institution_id, name, email, password, role
    FROM institution_users
    WHERE email = $1
  `;
  const { rows } = await pool.query(sql, [payload.email.toLowerCase()]);

  if (rows.length === 0) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const user = rows[0];
  
  // SUPPORT PLAIN TEXT FALLBACK
  let ok = false;
  try {
    ok = await bcrypt.compare(payload.password, user.password);
  } catch (err) {
    // If user.password is not a hash, compare normally
  }
  
  const plainMatch = payload.password === user.password;
  
  if (!ok && !plainMatch) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken(user);
  const tokenId = uuidv4();
```
