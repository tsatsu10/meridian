import { Hono } from "hono";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { billingCustomers, billingInvoices, billingSubscriptions } from "./schema";
import { BillingProviderFactory } from "./provider-factory";
import { createCheckoutSession } from "./controllers/create-checkout";

const billing = new Hono();

billing.post("/checkout", createCheckoutSession);

billing.get("/subscriptions/:userId", async (c) => {
  const userId = c.req.param("userId");
  const db = getDatabase();

  const allCustomers = await db.select().from(billingCustomers);
  const customers = allCustomers.filter((customer) => {
    const metadata = customer.metadata as Record<string, unknown> | null;
    return typeof metadata?.userId === "string" && metadata.userId === userId;
  });

  const customerIds = customers.map((customer) => customer.id);
  if (customerIds.length === 0) {
    return c.json({ data: [] });
  }

  const subscriptions = await db
    .select()
    .from(billingSubscriptions)
    .where(inArray(billingSubscriptions.customerId, customerIds))
    .orderBy(desc(billingSubscriptions.createdAt));

  return c.json({ data: subscriptions });
});

billing.get("/invoices/:userId", async (c) => {
  const userId = c.req.param("userId");
  const db = getDatabase();

  const allCustomers = await db.select().from(billingCustomers);
  const customers = allCustomers.filter((customer) => {
    const metadata = customer.metadata as Record<string, unknown> | null;
    return typeof metadata?.userId === "string" && metadata.userId === userId;
  });

  const customerIds = customers.map((customer) => customer.id);
  if (customerIds.length === 0) {
    return c.json({ data: [] });
  }

  const invoices = await db
    .select()
    .from(billingInvoices)
    .where(inArray(billingInvoices.customerId, customerIds))
    .orderBy(desc(billingInvoices.createdAt));

  return c.json({ data: invoices });
});

billing.post("/subscriptions/:subscriptionId/cancel", async (c) => {
  const subscriptionId = c.req.param("subscriptionId");
  const body = await c.req.json().catch(() => ({}));
  const immediate = Boolean(body.immediate);
  const db = getDatabase();

  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    return c.json({ error: "Subscription not found" }, 404);
  }

  const provider = BillingProviderFactory.getProvider(subscription.provider as "stripe" | "paystack");
  await provider.cancelSubscription(subscription.providerSubscriptionId, immediate);

  await db
    .update(billingSubscriptions)
    .set({
      status: immediate ? "canceled" : subscription.status,
      cancelAtPeriodEnd: !immediate,
      canceledAt: immediate ? new Date() : subscription.canceledAt,
      updatedAt: new Date(),
    })
    .where(eq(billingSubscriptions.id, subscriptionId));

  return c.json({ success: true });
});

billing.post("/portal", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { userId, returnUrl } = body as { userId?: string; returnUrl?: string };
  if (!userId || !returnUrl) {
    return c.json({ error: "Missing required fields: userId, returnUrl" }, 400);
  }

  const db = getDatabase();
  const allCustomers = await db.select().from(billingCustomers);
  const customer = allCustomers.find((row) => {
    const metadata = row.metadata as Record<string, unknown> | null;
    return typeof metadata?.userId === "string" && metadata.userId === userId;
  });

  if (!customer) {
    return c.json({ error: "Billing customer not found for user" }, 404);
  }

  const provider = BillingProviderFactory.getProvider(customer.provider as "stripe" | "paystack");
  const session = await provider.createPortalSession(customer.providerCustomerId, returnUrl);
  return c.json({ data: { url: session.url } });
});

export default billing;
