# deleteUser

## Location
- Source: users/users.service.js
- Lines: 109-123

## Signature
```js
deleteUser(actor, id, ipAddress)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- actor
- id
- ipAddress

## Implementation Snapshot
```js
async function deleteUser(actor, id, ipAddress) {
  const current = await getUserById(actor, id);
  await pool.query("DELETE FROM institution_users WHERE id = $1", [id]);

  await writeAuditLog({
    userId: actor.userId,
    action: "user.delete",
    entityType: "user",
    entityId: id,
    oldValues: current,
    ipAddress
  });

  return { id, deleted: true };
}
```
