// DEPRECATED: This function ('telegram-notifier') is obsolete and should not be used.
// Please delete this directory ('supabase/functions/telegram-notifier').
// The new, unified function for all Telegram operations is 'telegram-service'.

// @ts-ignore
Deno.serve(async (req) => {
  console.error("DEPRECATION WARNING: The 'telegram-notifier' function was called but is obsolete. Please use 'telegram-service' instead.");
  
  const errorMessage = "This Edge Function ('telegram-notifier') is deprecated and should be deleted. All Telegram functionality has been migrated to the 'telegram-service' function. Please update your client-side code and remove this function from your Supabase project to avoid errors.";

  return new Response(
    JSON.stringify({ 
      error: "DEPRECATED_FUNCTION_CALL",
      message: errorMessage,
    }),
    {
      status: 410, // 410 Gone
      headers: { "Content-Type": "application/json" },
    }
  );
});
