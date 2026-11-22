// The publishable key is safe to use in browser code when RLS protects the database.
const SUPABASE_URL = "https://yzkvkxagkakofmfgorvx.supabase.co";
const SUPABASE_KEY = "sb_publishable_kEnSCUiNHaI1GQCpRwtgNA_Hu1w5gHh";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
