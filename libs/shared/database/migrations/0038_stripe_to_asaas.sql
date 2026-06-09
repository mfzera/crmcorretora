ALTER TABLE "subscription" DROP CONSTRAINT "subscription_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "invoice" DROP CONSTRAINT "invoice_stripe_invoice_id_unique";--> statement-breakpoint
DROP INDEX "idx_subscription_stripe_customer";--> statement-breakpoint
DROP INDEX "idx_subscription_stripe_subscription";--> statement-breakpoint
DROP INDEX "idx_invoice_stripe_id";--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "asaas_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "asaas_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "asaas_payment_id" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_subscription_asaas_customer" ON "subscription" USING btree ("asaas_customer_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_asaas_subscription" ON "subscription" USING btree ("asaas_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_asaas_payment" ON "invoice" USING btree ("asaas_payment_id");--> statement-breakpoint
ALTER TABLE "plano" DROP COLUMN "stripe_product_id";--> statement-breakpoint
ALTER TABLE "plano" DROP COLUMN "stripe_base_price_id";--> statement-breakpoint
ALTER TABLE "plano" DROP COLUMN "stripe_seat_price_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripe_subscription_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripe_base_item_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stripe_seat_item_id";--> statement-breakpoint
ALTER TABLE "invoice" DROP COLUMN "stripe_invoice_id";--> statement-breakpoint
ALTER TABLE "invoice" DROP COLUMN "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_asaas_subscription_id_unique" UNIQUE("asaas_subscription_id");--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_asaas_payment_id_unique" UNIQUE("asaas_payment_id");