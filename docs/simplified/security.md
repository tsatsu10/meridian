### Security in Meridian — A Simple Guide

This is how we keep data safe without overcomplicating it.

#### Core practices
- Authentication: session cookie (`session`) set on sign‑in, validated on each request.
- Authorization: RBAC checks on server routes; UI gates actions by permission.
- Least privilege: users get only what they need for their role.
- Auditability: role changes and sensitive actions are logged (see backend logs and role history).

#### Data protection
- HTTPS in production; cookies are `httpOnly` and `secure` in prod.
- Input validation and safe database queries via ORM.
- File uploads stored with access rules; previews/thumbnails generated safely.

#### Realtime and APIs
- WebSocket joins require valid session and workspace/channel checks.
- REST endpoints verify session and permissions.

#### What to check before shipping
- All critical routes enforce role permissions.
- No sensitive data in logs; errors are informative but not revealing.
- Dependencies audited; linters and type checks pass.

See also: `SECURITY_IMPLEMENTATION.md` for full details.


