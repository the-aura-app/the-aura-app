// App JS will be added step-by-step
console.log("The Aura loaded successfully");
// Initialize Supabase
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let anon_id = localStorage.getItem("aura_anon_id");

if (!anon_id) {
    anon_id = crypto.randomUUID();
    localStorage.setItem("aura_anon_id", anon_id);
}

function track(event, data = {}) {
    posthog.capture(event, {
        anon_id,
        ...data
    });
}

track("view_home");
track("scan_aura", { color: "Emerald Green" });
track("decode_analysis", { verdict: "low_effort" });

track("app_loaded");
track("daily_active");
