// @ts-nocheck - Next.js file, not part of Hono API
import { getUser } from "../../../../lib/auth";
import { handleApiError } from "../../../../lib/api-error";
import updateProfile from "../../../../profile/controllers/update-profile";
import { ProfileUpdateData } from "../../../../profile/types";

export async function PUT(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json() as ProfileUpdateData;
    const result = await updateProfile(user.id, data);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile settings
    const profile = await getProfile(user.id);
    return Response.json(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

