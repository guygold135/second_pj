// Supabase Edge Function: stripe-stake
// Handles stake operations via Stripe and Supabase stakes table.
// Deploy: supabase functions deploy stripe-stake
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; optional: CRON_SECRET (for process_due_stakes)

import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errResponse("Method not allowed", 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
    return errResponse("Missing environment configuration", 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errResponse("Invalid JSON body");
  }

  const action = body.action as string | undefined;
  if (!action) {
    return errResponse("Missing action");
  }

  try {
    switch (action) {
      case "create_setup_intent": {
        const stakeId = body.stakeId as string | undefined;
        const amount = body.amount as number | undefined;
        const currency = (body.currency as string) || "usd";
        const description = (body.description as string) || "";
        const dueDate = body.dueDate as string | undefined;
        const userId = body.userId as string | undefined;
        const itemId = body.itemId as string | undefined;
        const itemType = body.itemType as string | undefined;
        const failureMode = (body.failureMode as string) || "both";

        if (!stakeId || amount == null || !dueDate || !userId || !itemId || !itemType) {
          return errResponse(
            "create_setup_intent requires: stakeId, amount, dueDate, userId, itemId, itemType"
          );
        }
        if (!["mission", "goal"].includes(itemType)) {
          return errResponse("itemType must be 'mission' or 'goal'");
        }
        if (!["self_report", "auto_deadline", "both"].includes(failureMode)) {
          return errResponse("failure_mode must be self_report, auto_deadline, or both");
        }

        const customer = await stripe.customers.create({
          metadata: { supabase_user_id: userId },
        });

        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ["card"],
          usage: "off_session",
        });

        const now = new Date().toISOString();
        const { error: insertError } = await supabase.from("stakes").insert({
          id: stakeId,
          user_id: userId,
          amount,
          currency,
          description,
          due_date: dueDate,
          customer_id: customer.id,
          payment_method_id: null,
          status: "pending_card",
          failure_mode: failureMode,
          item_id: itemId,
          item_type: itemType,
          created_at: now,
          updated_at: now,
        });

        if (insertError) {
          return errResponse(`Failed to create stake: ${insertError.message}`, 500);
        }

        return jsonResponse({
          clientSecret: setupIntent.client_secret,
          customerId: customer.id,
        });
      }

      case "confirm_stake": {
        const stakeId = body.stakeId as string | undefined;
        const paymentMethodId = body.paymentMethodId as string | undefined;

        if (!stakeId || !paymentMethodId) {
          return errResponse("confirm_stake requires: stakeId, paymentMethodId");
        }

        const { data: stake, error: fetchError } = await supabase
          .from("stakes")
          .select("id, status")
          .eq("id", stakeId)
          .single();

        if (fetchError || !stake) {
          return errResponse("Stake not found", 404);
        }
        if (stake.status !== "pending_card") {
          return errResponse("Stake is not in pending_card status");
        }

        const { error: updateError } = await supabase
          .from("stakes")
          .update({
            payment_method_id: paymentMethodId,
            status: "active",
          })
          .eq("id", stakeId);

        if (updateError) {
          return errResponse(`Failed to confirm stake: ${updateError.message}`, 500);
        }

        return jsonResponse({ success: true });
      }

      case "charge_stake": {
        const stakeId = body.stakeId as string | undefined;
        const reason = (body.reason as string) || "Stake not completed";

        if (!stakeId) {
          return errResponse("charge_stake requires: stakeId");
        }

        const { data: stake, error: fetchError } = await supabase
          .from("stakes")
          .select("id, status, amount, currency, customer_id, payment_method_id")
          .eq("id", stakeId)
          .single();

        if (fetchError || !stake) {
          return errResponse("Stake not found", 404);
        }
        if (stake.status !== "active") {
          return errResponse("Stake is not active");
        }
        if (!stake.payment_method_id || !stake.customer_id) {
          return errResponse("Stake has no payment method");
        }

        const amountCents = Math.round(Number(stake.amount) * 100);
        if (amountCents < 1) {
          return errResponse("Invalid stake amount");
        }

        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency: (stake.currency as string) || "usd",
            customer: stake.customer_id,
            payment_method: stake.payment_method_id,
            off_session: true,
            confirm: true,
            description: reason,
          },
          { idempotencyKey: stakeId }
        );

        const chargeId =
          paymentIntent.latest_charge &&
          typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.id;

        const { error: updateError } = await supabase
          .from("stakes")
          .update({
            status: "charged",
            charge_id: chargeId,
          })
          .eq("id", stakeId);

        if (updateError) {
          return errResponse(`Failed to update stake: ${updateError.message}`, 500);
        }

        return jsonResponse({ success: true, chargeId });
      }

      case "process_due_stakes": {
        const cronSecret = Deno.env.get("CRON_SECRET");
        if (cronSecret && body.cronSecret !== cronSecret) {
          return errResponse("Unauthorized", 401);
        }

        const now = new Date().toISOString();
        const { data: dueStakes, error: fetchError } = await supabase
          .from("stakes")
          .select("id, user_id, item_id, item_type, amount, currency, customer_id, payment_method_id")
          .eq("status", "active")
          .lt("due_date", now)
          .in("failure_mode", ["auto_deadline", "both"]);

        if (fetchError) {
          return errResponse(`Failed to fetch due stakes: ${fetchError.message}`, 500);
        }

        const results: { stakeId: string; charged: boolean; error?: string }[] = [];

        for (const stake of dueStakes ?? []) {
          const stakeId = stake.id as string;
          const itemId = stake.item_id as string;
          const itemType = stake.item_type as string;
          const userId = stake.user_id as string;

          let completed = false;
          if (itemType === "mission") {
            const { data: mission } = await supabase
              .from("missions")
              .select("is_completed")
              .eq("id", itemId)
              .eq("user_id", userId)
              .maybeSingle();
            completed = mission?.is_completed === true;
          } else if (itemType === "goal") {
            const { data: goal } = await supabase
              .from("goals")
              .select("progress_percent")
              .eq("id", itemId)
              .eq("user_id", userId)
              .maybeSingle();
            const pct = goal?.progress_percent != null ? Number(goal.progress_percent) : 0;
            completed = pct >= 100;
          }

          if (completed) {
            await supabase.from("stakes").update({ status: "succeeded" }).eq("id", stakeId);
            results.push({ stakeId, charged: false });
            continue;
          }

          const amountCents = Math.round(Number(stake.amount) * 100);
          if (amountCents < 1) {
            results.push({ stakeId, charged: false, error: "Invalid amount" });
            continue;
          }
          if (!stake.payment_method_id || !stake.customer_id) {
            results.push({ stakeId, charged: false, error: "No payment method" });
            continue;
          }

          try {
            const paymentIntent = await stripe.paymentIntents.create(
              {
                amount: amountCents,
                currency: (stake.currency as string) || "usd",
                customer: stake.customer_id,
                payment_method: stake.payment_method_id,
                off_session: true,
                confirm: true,
                description: "Stake not completed by deadline",
              },
              { idempotencyKey: stakeId }
            );
            const chargeId =
              paymentIntent.latest_charge &&
              typeof paymentIntent.latest_charge === "string"
                ? paymentIntent.latest_charge
                : paymentIntent.id;
            const { error: updateError } = await supabase
              .from("stakes")
              .update({ status: "charged", charge_id: chargeId })
              .eq("id", stakeId);
            if (updateError) throw updateError;
            results.push({ stakeId, charged: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            results.push({ stakeId, charged: false, error: msg });
          }
        }

        return jsonResponse({ processed: results.length, results });
      }

      case "succeed_stake": {
        const stakeId = body.stakeId as string | undefined;

        if (!stakeId) {
          return errResponse("succeed_stake requires: stakeId");
        }

        const { error: updateError } = await supabase
          .from("stakes")
          .update({ status: "succeeded" })
          .eq("id", stakeId);

        if (updateError) {
          return errResponse(`Failed to update stake: ${updateError.message}`, 500);
        }

        return jsonResponse({ success: true });
      }

      default:
        return errResponse(`Unknown action: ${action}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
