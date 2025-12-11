/**
 * The Aura App - Main Application JavaScript
 * Daily habit loop engine for women 25-35 in Indian IT culture
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
// TIME-BASED GREETING MESSAGES (Women-focused language)
// ============================================
const greetings = {
    morning: [
        "Good morning. Your Glow Potential today is unusually high.",
        "Rise and shine, queen. Today's aura is radiating clarity.",
        "Morning energy check: You're in your power today."
    ],
    afternoon: [
        "Corporate Shield Active. Let's keep your peace intact.",
        "Afternoon energy dip detected. Here's what you need to know.",
        "You're doing better than you think. Let's decode today."
    ],
    evening: [
        "You're emotionally overloaded. Let's decode him together.",
        "Evening clarity: What you're feeling makes perfect sense.",
        "Relationship thoughts? Your aura has answers."
    ]
};

// ============================================
// INSIGHT CARDS DATA (Rotating daily insights)
// ============================================
const insights = [
    {
        title: "The Intuition Card",
        description: "Your inner voice is speaking louder than usual today. Trust what you feel in your gut about that project (or that person). The data will follow.",
        emoji: "✨"
    },
    {
        title: "The Boundary Card",
        description: "Someone's energy is draining yours. It's not selfish to protect your peace. A simple 'no' today saves you hours of regret tomorrow.",
        emoji: "🛡️"
    },
    {
        title: "The Confidence Card",
        description: "That thing you're doubting? You're actually better at it than you realize. The imposter syndrome is lying. Your work speaks.",
        emoji: "💪"
    },
    {
        title: "The Clarity Card",
        description: "That relationship confusion? It's not about you being unclear. It's about him being unclear. Accept that today and move forward.",
        emoji: "🔮"
    },
    {
        title: "The Recovery Card",
        description: "You've been running on fumes. Today is a permission slip to slow down, rest, and let your energy rebuild. The world won't collapse.",
        emoji: "🌙"
    },
    {
        title: "The Ambition Card",
        description: "Your career move? Go for it. Your gut is telling you now because the timing is right. Trust the impulse.",
        emoji: "🚀"
    }
];

// ============================================
// UTILITY: Get time-based greeting
// ============================================
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    let timeOfDay;

    if (hour >= 5 && hour < 12) {
        timeOfDay = "morning";
    } else if (hour >= 12 && hour < 19) {
        timeOfDay = "afternoon";
    } else {
        timeOfDay = "evening";
    }

    const greetingList = greetings[timeOfDay];
    return greetingList[Math.floor(Math.random() * greetingList.length)];
}

// ============================================
// UTILITY: Get daily insight (deterministic based on date)
// ============================================
function getDailyInsight() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem("aura_insight_date");
    const savedInsight = localStorage.getItem("aura_insight_index");

    if (savedDate === today && savedInsight !== null) {
        // Return same insight for the day
        return insights[parseInt(savedInsight)];
    } else {
        // New day, new insight
        const insightIndex = Math.floor(Math.random() * insights.length);
        localStorage.setItem("aura_insight_date", today);
        localStorage.setItem("aura_insight_index", insightIndex);
        return insights[insightIndex];
    }
}

// ============================================
// UTILITY: Track engagement for signup trigger
// ============================================
function incrementEngagement() {
    let engagement = localStorage.getItem("aura_engagement_count");
    engagement = engagement ? parseInt(engagement) + 1 : 1;
    localStorage.setItem("aura_engagement_count", engagement);
    return engagement;
}

// ============================================
// UTILITY: Check if user has already signed up
// ============================================
function isUserSignedUp() {
    return localStorage.getItem("aura_user_signed_up") === "true";
}


// ============================================
// DOM INITIALIZATION AND EVENT HANDLERS
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

// ============================================
// MAIN APP INITIALIZATION
// ============================================
function initializeApp() {
    // Load greeting
    loadGreeting();
    
    // Load daily insight
    loadInsight();
    
    // Setup event listeners
    initializeEventListeners();
    
    // Check if should show signup prompt
    checkSignupTrigger();
    
    // Track session
    track("session_start");
}

// ============================================
// LOAD GREETING
// ============================================
function loadGreeting() {
    const greeting = getTimeBasedGreeting();
    document.getElementById("greetingText").textContent = greeting;
}

// ============================================
// LOAD INSIGHT CARD
// ============================================
function loadInsight() {
    const insight = getDailyInsight();
    document.getElementById("insightTitle").textContent = insight.title;
    document.getElementById("insightDescription").textContent = insight.description;
    track("insight_viewed", { insight_title: insight.title });
}

// ============================================
// EVENT LISTENER SETUP
// ============================================
function initializeEventListeners() {
    const refreshBtn = document.getElementById("refreshInsightBtn");
    const saveBtn = document.getElementById("saveInsightBtn");
    const signupCtaBtn = document.getElementById("signupCtaBtn");
    const submitBtn = document.getElementById("submitBtn");

    refreshBtn.addEventListener("click", handleRefreshInsight);
    saveBtn.addEventListener("click", handleSaveInsight);
    signupCtaBtn?.addEventListener("click", handleSignupCta);
    submitBtn.addEventListener("click", handleFormSubmit);
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleRefreshInsight() {
    // Clear saved insight to get a new one
    localStorage.removeItem("aura_insight_date");
    localStorage.removeItem("aura_insight_index");
    
    loadInsight();
    incrementEngagement();
    track("insight_refreshed");
}

function handleSaveInsight() {
    incrementEngagement();
    track("insight_saved");
    
    // Show signup CTA after saving
    checkSignupTrigger();
}

function handleSignupCta() {
    const ctaSection = document.getElementById("ctaSection");
    const signupSection = document.getElementById("signupSection");
    
    ctaSection.classList.add("hidden");
    signupSection.classList.remove("hidden");
    track("signup_cta_clicked");
}

async function handleFormSubmit() {
    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();

    // Validate input
    if (!name) {
        alert("Please enter your name.");
        return;
    }

    try {
        // Insert user data into Supabase
        const { data, error } = await db
            .from("users")
            .insert([
                {
                    name: name,
                    phone: phone || null,
                    anon_id: anon_id,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error("Supabase error:", error);
            alert("Something went wrong. Please try again.");
            track("user_signup_failed", { error: error.message });
            return;
        }

        // Mark as signed up
        localStorage.setItem("aura_user_signed_up", "true");
        localStorage.setItem("aura_user_name", name);

        alert("Welcome to The Aura! 🌟");
        track("user_signup_success", { 
            name, 
            phone: phone ? "provided" : "not_provided",
            engagement_count: localStorage.getItem("aura_engagement_count") || "0"
        });

        // Hide form and show confirmation
        document.getElementById("signupSection").classList.add("hidden");
        document.getElementById("ctaSection").classList.add("hidden");
        
    } catch (error) {
        console.error("Error:", error);
        alert("An unexpected error occurred.");
    }
}

// ============================================
// SIGNUP TRIGGER LOGIC
// ============================================
function checkSignupTrigger() {
    const alreadySignedUp = isUserSignedUp();
    const engagement = parseInt(localStorage.getItem("aura_engagement_count") || "0");
    const ctaSection = document.getElementById("ctaSection");

    // Show signup CTA after 2 engagements (save or refresh)
    if (!alreadySignedUp && engagement >= 2) {
        ctaSection.classList.remove("hidden");
        track("signup_prompt_shown", { engagement_count: engagement });
    }
}