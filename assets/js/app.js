/**
 * The Aura App - Main Application JavaScript
 */

console.log("The Aura loaded successfully");

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// ANONYMOUS USER TRACKING
// ============================================
let anon_id = localStorage.getItem("aura_anon_id");

if (!anon_id) {
    anon_id = crypto.randomUUID();
    localStorage.setItem("aura_anon_id", anon_id);
}

// ============================================
// ANALYTICS TRACKING FUNCTION
// ============================================
function track(event, data = {}) {
    posthog.capture(event, {
        anon_id,
        ...data
    });
}

// Track initial page view
track("app_loaded");
track("daily_active");

// ============================================
// DOM INITIALIZATION AND EVENT HANDLERS
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
});

// ============================================
// EVENT LISTENER SETUP
// ============================================
function initializeEventListeners() {
    const startBtn = document.getElementById("startBtn");
    const formSection = document.getElementById("formSection");
    const submitBtn = document.getElementById("submitBtn");

    // Handle "Start Now" button click
    startBtn.addEventListener("click", handleStartClick);

    // Handle form submission
    submitBtn.addEventListener("click", handleFormSubmit);
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleStartClick() {
    const startBtn = document.getElementById("startBtn");
    const formSection = document.getElementById("formSection");

    formSection.classList.remove("hidden");
    startBtn.parentElement.classList.add("hidden");
    track("form_opened");
}

async function handleFormSubmit() {
    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();

    // Validate input
    if (!name) {
        alert("Please enter your name.");
        return;
    }

    // Insert user data into Supabase
    const { data, error } = await db
        .from("users")
        .insert([
            {
                name: name,
                phone: phone || null,
                created_at: new Date().toISOString()
            }
        ]);

    if (error) {
        console.error("Supabase error:", error);
        alert("Something went wrong. Please try again.");
        track("user_signup_failed", { error: error.message });
        return;
    }

    alert("Profile saved successfully.");
    track("user_signup_success", { name, phone: phone ? "provided" : "not_provided" });
}