import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // We need to know the production URL of the Next.js app and the secret.
  // These will be configured as environment variables in Supabase.
  const appUrl = Deno.env.get("APP_URL"); 
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!appUrl || !cronSecret) {
    return new Response(
      JSON.stringify({ error: "Missing APP_URL or CRON_SECRET environment variables in Edge Function." }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log(`Triggering cron job at ${appUrl}/api/cron/publish-scheduled...`);

    const res = await fetch(`${appUrl}/api/cron/publish-scheduled`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${cronSecret}`
      }
    });

    const data = await res.json();
    console.log("Cron response:", data);

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: res.status
    });

  } catch (err: any) {
    console.error("Cron trigger failed:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});
