import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function getUser(req: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; email: string; name: string };
  } catch (error) {
    return null;
  }
}

