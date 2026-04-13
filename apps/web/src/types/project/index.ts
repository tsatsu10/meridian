import type { client } from "@meridian/libs";
import type { InferResponseType } from "hono/client";

export type Project = Extract<
  InferResponseType<(typeof client)["project"][":id"]["$get"], 200>,
  { id: string }
>;

export type ProjectWithTasks = Extract<
  InferResponseType<
    (typeof client)["task"]["tasks"][":projectId"]["$get"],
    200
  >,
  { id: string }
>;

/** Projects hub / list rows (API list payload + optional owner display name). */
export type ProjectDashboardRow = ProjectWithTasks & {
  ownerName?: string;
};
