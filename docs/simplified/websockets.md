### Realtime in Meridian — A Simple Guide

Meridian uses WebSockets to keep dashboards, boards, and chat in sync without refreshing.

#### The basic idea
- Everyone connected to a workspace joins rooms for that workspace and its channels.
- When something happens (e.g., a new message), the server broadcasts to the right room.

#### Key parts
- Server: `apps/api/src/realtime/unified-websocket-server.ts`
  - Verifies a user can access a workspace/channel before joining
  - Broadcasts events like `chat:message` to all listeners

#### Authentication
- Your browser keeps a `session` cookie from sign‑in.
- The server checks your session before letting you join rooms.

#### What goes over the wire
- Events are small JSON messages (e.g., a chat message or task update).
- Only clients in the same workspace/channel receive them.

#### How to try it
1) Start API and Web.
2) Open two browser windows, sign in as two users in the same workspace.
3) Send a chat message or update a task; the other window updates instantly.

#### Troubleshooting
- Can’t connect: ensure API is running and proxy is set (Vite dev server proxies `/api`).
- Not receiving events: confirm both users are in the same workspace/channel.
- Auth issues: check you have a valid `session` cookie (or dev bearer token).


