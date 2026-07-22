import bcrypt from "bcrypt";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../../utils/errors";

async function signIn(email: string, password: string) {
  const db = getDatabase();
  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  const user = users[0];

  // Same message for "no such user" and "wrong password" — distinguishing
  // them lets a caller enumerate valid accounts by email.
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export default signIn;
