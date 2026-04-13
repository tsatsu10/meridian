import bcrypt from "bcrypt";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import { eq } from "drizzle-orm";

async function signIn(email: string, password: string) {
  const db = getDatabase();
  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  
  const user = users[0];

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export default signIn;

