import type { client } from "@meridian/libs";
import type { InferResponseType } from "hono/client";

export type Workspace = Extract<
  InferResponseType<(typeof client)["workspace"][":id"]["$get"]>,
  { id: string }
>;

export default Workspace;
