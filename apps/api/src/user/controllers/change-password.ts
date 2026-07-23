import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import { commonSchemas } from "../../lib/validation";
import { UnauthorizedError, ValidationError } from "../../utils/errors";

async function changePassword(
  userEmail: string,
  currentPassword: string,
  newPassword: string,
) {
  const db = getDatabase();

  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password,
  );
  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const validation = commonSchemas.password.safeParse(newPassword);
  if (!validation.success) {
    throw new ValidationError(
      validation.error.issues[0]?.message || "Invalid password",
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db
    .update(userTable)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(userTable.id, user.id));
}

export default changePassword;
