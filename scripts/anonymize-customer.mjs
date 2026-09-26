import { db, id, now } from "./operator-db.mjs";
const customerId = process.argv[2];
try {
  if (!customerId || process.argv[3] !== "--confirm")
    throw new Error(
      "Usage: node scripts/anonymize-customer.mjs CUSTOMER_UUID --confirm. This irreversibly removes customer identity and notes. Verify the request and retention policy first.",
    );
  await db.transaction(async (trx) => {
    const customer = await trx("customers").where({ id: customerId }).first();
    if (!customer) throw new Error("Customer not found");
    if (
      await trx("bookings").where({ customerId, status: "confirmed" }).first()
    )
      throw new Error("Resolve confirmed appointments first.");
    const bookings = await trx("bookings").where({ customerId }).select("id");
    await trx("outbox")
      .where("to", customer.email)
      .orWhereIn(
        "bookingId",
        bookings.map((b) => b.id),
      )
      .delete();
    await trx("bookings")
      .where({ customerId })
      .update({ notes: "", tokenHash: null });
    await trx("customers")
      .where({ id: customerId })
      .update({
        name: "Anonymized customer",
        email: `removed-${customerId}@invalid.example`,
        phone: "",
        notes: "",
        marketing: false,
      });
    await trx("audit").insert({
      id: id(),
      actor: "operator",
      action: "customer.anonymized",
      entityId: customerId,
      createdAt: now(),
    });
  });
  console.log(
    "Customer identity removed; appointment accounting history retained. Also apply your backup retention policy.",
  );
} finally {
  await db.destroy();
}
