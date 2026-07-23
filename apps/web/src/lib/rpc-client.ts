import { client } from "@meridian/libs";

// Several routes are missing from the generated Hono `AppType`, so the RPC
// client isn't statically typed for them. Rather than sprinkling `(client as
// any)` across every fetcher, we expose a single loosely-typed accessor: a
// value that is both indexable (to walk the route path) and callable (to invoke
// the `$get`/`$post`/… method), returning a standard `Response`.
type LooseRoute = {
  [segment: string]: LooseRoute;
} & ((arg?: unknown) => Promise<Response>);

export const looseClient = client as unknown as LooseRoute;
