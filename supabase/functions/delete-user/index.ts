import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const callerUserId = userData.user?.id;
    if (!callerUserId) throw new Error("User not authenticated");
    logStep("Caller authenticated", { callerUserId });

    // Check if caller is an admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
      _user_id: callerUserId,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      logStep("Access denied - not an admin", { isAdmin, roleError });
      throw new Error("Access denied: Admin privileges required");
    }
    logStep("Admin role verified");

    // Get the user ID to delete from the request
    const { userId } = await req.json();
    if (!userId) throw new Error("Missing userId to delete");
    logStep("Target user to delete", { userId });

    // Prevent self-deletion
    if (userId === callerUserId) {
      throw new Error("Cannot delete your own account");
    }

    // Delete in order: offer_letters, candidates, job_openings, profiles, then auth user
    logStep("Deleting offer_letters");
    const { error: offerError } = await supabase
      .from("offer_letters")
      .delete()
      .eq("hr_user_id", userId);
    if (offerError) logStep("Error deleting offer_letters", { error: offerError.message });

    logStep("Deleting candidates");
    const { error: candidatesError } = await supabase
      .from("candidates")
      .delete()
      .eq("user_id", userId);
    if (candidatesError) logStep("Error deleting candidates", { error: candidatesError.message });

    logStep("Deleting job_openings");
    const { error: jobsError } = await supabase
      .from("job_openings")
      .delete()
      .eq("user_id", userId);
    if (jobsError) logStep("Error deleting job_openings", { error: jobsError.message });

    logStep("Deleting profile");
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileError) logStep("Error deleting profile", { error: profileError.message });

    logStep("Deleting user_roles");
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) logStep("Error deleting user_roles", { error: rolesError.message });

    logStep("Deleting subscription_history");
    const { error: subHistError } = await supabase
      .from("subscription_history")
      .delete()
      .eq("user_id", userId);
    if (subHistError) logStep("Error deleting subscription_history", { error: subHistError.message });

    // Finally, delete the auth user
    logStep("Deleting auth user");
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      logStep("Error deleting auth user", { error: authDeleteError.message });
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    logStep("User deleted successfully", { userId });

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    logStep("ERROR in delete-user", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
