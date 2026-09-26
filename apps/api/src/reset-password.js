import { db } from "./db.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
const email = z.email().parse(process.env.ADMIN_EMAIL).toLowerCase();
const password = z.string().min(12).max(128).parse(process.env.ADMIN_PASSWORD);
try {
  const user = await db("users").where({ email, active: true }).first();
  if (!user) throw new Error("Active user not found");
  await db.transaction(async (trx) => {
    await trx("users")
      .where({ id: user.id })
      .update({ password: await bcrypt.hash(password, 12) });
    await trx("sessions").where({ userId: user.id }).delete();
  });
  console.log("Password reset and all sessions revoked.");
} finally {
  await db.destroy();
}
