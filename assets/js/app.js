/**
 * The Aura App - Main Application JavaScript
 * Daily habit loop engine with Hook Model (Trigger → Action → Reward → Investment)
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
        return insights[parseInt(savedInsight)];
    } else {
        const insightIndex = Math.floor(Math.random() * insights.length);
        localStorage.setItem("aura_insight_date", today);
        localStorage.setItem("aura_insight_index", insightIndex);
        return insights[insightIndex];
    }
}

// ============================================
// UTILITY: Generate variable aura score (HOOK MODEL: Variable Reward)
// ============================================
function generateAuraScore() {
    return Math.floor(Math.random() * 60) + 40;
}

// ============================================
// UTILITY: Get personalized affirmation
// ============================================
function getPersonalizedAffirmation(mood) {
    if (!mood || !affirmations[mood]) {
        mood = Object.keys(affirmations)[Math.floor(Math.random() * Object.keys(affirmations).length)];
    }
    return affirmations[mood][Math.floor(Math.random() * affirmations[mood].length)];
}

// ============================================
// UTILITY: Calculate streak (HOOK MODEL: Investment)
// ============================================
async function updateStreak() {
    const lastVisit = localStorage.getItem("aura_last_visit");
    const today = new Date().toDateString();
    let streak = parseInt(localStorage.getItem("aura_streak") || "0");

    // If there's no last visit recorded, this is the first visit — start streak at 1
    if (!lastVisit) {
        streak = 1;
        localStorage.setItem("aura_streak", streak);
        localStorage.setItem("aura_last_visit", today);

        // Reset personalization filled flag for new day
        localStorage.removeItem("aura_personalization_filled_today");

        // Persist to Supabase if user exists
        if (isUserSignedUp()) {
            const userData = getUserData();
            try {
                await db
                    .from("users")
                    .update({
                        streak_count: streak,
                        last_visit_date: today,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", userData.id);
            } catch (error) {
                console.error("Error updating streak:", error);
            }
        }

        return streak;
    }

    // If user has visited before but not today, calculate diff
    if (lastVisit !== today) {
        const lastVisitDate = new Date(lastVisit);
        const todayDate = new Date();
        const diffTime = todayDate - lastVisitDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak = streak + 1;
        } else if (diffDays > 1) {
            streak = 1;
        }

        localStorage.setItem("aura_streak", streak);
        localStorage.setItem("aura_last_visit", today);

        // Reset personalization filled flag for new day
        localStorage.removeItem("aura_personalization_filled_today");

        // Save streak to Supabase for signed-up users
        if (isUserSignedUp()) {
            const userData = getUserData();
            try {
                await db
                    .from("users")
                    .update({
                        streak_count: streak,
                        last_visit_date: today,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", userData.id);
            } catch (error) {
                console.error("Error updating streak:", error);
            }
        }
    }

    return streak;
}

// ============================================
// AFFIRMATIONS BY MOOD & INTENT
// ============================================
const affirmations = {
    energized: [
        "Channel this energy into something that matters to you.",
        "This is your moment to shine. Use it.",
        "Your momentum is real. Keep going."
    ],
    stressed: [
        "You've handled hard things before. You'll handle this too.",
        "This stress is temporary. You're stronger than it.",
        "Take a breath. You're doing better than you think."
    ],
    confused: [
        "Clarity comes from action, not overthinking.",
        "You don't need all the answers right now.",
        "Trust the process. The next step will reveal itself."
    ],
    lonely: [
        "Your presence matters more than you know.",
        "Solitude is not the same as loneliness. Use this time.",
        "You are enough, exactly as you are."
    ],
    confident: [
        "Keep this energy. The world needs it.",
        "You're exactly where you need to be.",
        "Trust yourself. You've earned this confidence."
    ],
    overwhelmed: [
        "You don't have to do everything today.",
        "One step at a time. You've got this.",
        "Release what's not in your control."
    ],
    calm: [
        "This clarity is your superpower. Hold onto it.",
        "Calmness looks good on you.",
        "You're in flow. Stay here."
    ]
};

// ============================================
// UTILITY: Check if user has already signed up
// ============================================
function isUserSignedUp() {
    return localStorage.getItem("aura_user_id") !== null;
}

// ============================================
// UTILITY: Get user data from localStorage
// ============================================
function getUserData() {
    return {
        id: localStorage.getItem("aura_user_id"),
        name: localStorage.getItem("aura_user_name"),
        mood: localStorage.getItem("aura_user_mood"),
        relationship_status: localStorage.getItem("aura_user_relationship"),
        stress_level: localStorage.getItem("aura_user_stress"),
        daily_intent: localStorage.getItem("aura_user_intent")
    };
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
    const isSignedUp = isUserSignedUp();
    // Ensure the waitlist section is visible (we show it by default in the UI)
    const waitlistSection = document.getElementById("waitlistSection");
    if (waitlistSection) waitlistSection.classList.remove("hidden");

    // Allow session-scoped tracking (persists across refresh) so the user sees joined state after refresh
    const isOnWaitlistSession = sessionStorage.getItem("aura_waitlist_joined") === "true";
    const isOnWaitlistLocal = localStorage.getItem("aura_waitlist_joined") === "true";

    if (isOnWaitlistSession || isOnWaitlistLocal) {
        joinWaitlistBtn.textContent = "✓ You're on the Waitlist";
        joinWaitlistBtn.disabled = true;
        joinWaitlistBtn.classList.add("opacity-70");
    }

    joinWaitlistBtn.addEventListener("click", async () => {
        const userData = getUserData();

        try {
            // Update UI immediately and set session flag for persistence across refresh
            sessionStorage.setItem("aura_waitlist_joined", "true");
            localStorage.setItem("aura_waitlist_joined", "true");
            joinWaitlistBtn.textContent = "✓ You're on the Waitlist";
            joinWaitlistBtn.disabled = true;
            joinWaitlistBtn.classList.add("opacity-70");

            // Save to waitlist in Supabase (if user is signed up)
            if (isUserSignedUp()) {
                const { error } = await db
                    .from("users")
                    .update({
                        waitlist_joined: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", userData.id);

                if (error) {
                    console.error("Error joining waitlist:", error);
                }
            }

            track("waitlist_joined");
        } catch (error) {
            console.error("Error:", error);
            // Ensure UI still reflects session state even if DB call fails
            sessionStorage.setItem("aura_waitlist_joined", "true");
            localStorage.setItem("aura_waitlist_joined", "true");
            joinWaitlistBtn.textContent = "✓ You're on the Waitlist";
            joinWaitlistBtn.disabled = true;
            joinWaitlistBtn.classList.add("opacity-70");
        }
}

// ============================================
// PROFILE VIEW (for signed-up users)
// ============================================
async function showProfileView() {
    const userData = getUserData();
    const streakSection = document.getElementById("streakSection");
    const personalizationSection = document.getElementById("personalizationSection");

    // Show streak counter (and update it)
    const streak = await updateStreak();
    streakSection.classList.remove("hidden");
    document.getElementById("streakCount").textContent = `${streak} day streak`;

    // Show personalization section
    personalizationSection.classList.remove("hidden");

    // Pre-fill values and show appropriate view
    populatePersonalizationForm(userData);
    showPersonalizationView(userData);

    // Load and show past analyses (but collapsed)
    loadPastAnalyses();
}

// ============================================
// POPULATE PERSONALIZATION FORM
// ============================================
function populatePersonalizationForm(userData) {
    if (userData.mood) document.getElementById("moodSelect").value = userData.mood;
    if (userData.stress_level) {
        document.getElementById("stressLevel").value = userData.stress_level;
        updateStressLabel(userData.stress_level);
    }
    if (userData.relationship_status) document.getElementById("relationshipSelect").value = userData.relationship_status;
    if (userData.daily_intent) document.getElementById("intentSelect").value = userData.daily_intent;
}

// ============================================
// SHOW PERSONALIZATION VIEW (Summary or Form)
// ============================================
function showPersonalizationView(userData) {
    const personalizationForm = document.getElementById("personalizationForm");
    const personalizationSummary = document.getElementById("personalizationSummary");

    const hasFilledToday = localStorage.getItem("aura_personalization_filled_today") === "true";

    if (hasFilledToday && userData.mood) {
        // Show summary
        personalizationForm.classList.add("hidden");
        personalizationSummary.classList.remove("hidden");
        updatePersonalizationSummary(userData);
    } else {
        // Show form
        personalizationForm.classList.remove("hidden");
        personalizationSummary.classList.add("hidden");
    }
}

// ============================================
// UPDATE PERSONALIZATION SUMMARY DISPLAY
// ============================================
function updatePersonalizationSummary(userData) {
    const moodSummary = document.getElementById("moodSummary");
    const stressSummary = document.getElementById("stressSummary");
    const relationshipSummary = document.getElementById("relationshipSummary");
    const intentSummary = document.getElementById("intentSummary");

    if (userData.mood) {
        moodSummary.classList.remove("hidden");
        document.getElementById("moodSummaryText").textContent = userData.mood.replace(/_/g, " ");
    }

    if (userData.stress_level) {
        stressSummary.classList.remove("hidden");
        const labels = ["Low", "Low", "Low", "Medium", "Medium", "Medium", "High", "High", "High", "Very High"];
        document.getElementById("stressSummaryText").textContent = labels[parseInt(userData.stress_level) - 1];
    }

    if (userData.relationship_status) {
        relationshipSummary.classList.remove("hidden");
        document.getElementById("relationshipSummaryText").textContent = userData.relationship_status.replace(/_/g, " ");
    }

    if (userData.daily_intent) {
        intentSummary.classList.remove("hidden");
        document.getElementById("intentSummaryText").textContent = userData.daily_intent.replace(/_/g, " ");
    }

    // Show a short affirmation tuned to mood to increase emotional resonance
    const affirmationEl = document.getElementById("personalAffirmation");
    if (affirmationEl) {
        const mood = userData.mood;
        const text = getPersonalizedAffirmation(mood);
        affirmationEl.textContent = text;
        affirmationEl.classList.remove("hidden");
    }
}

// ============================================
// LOAD GREETING
// ============================================
function loadGreeting() {
    const greeting = getTimeBasedGreeting();
    document.getElementById("greetingText").textContent = greeting;
}

// ============================================
// LOAD INSIGHT CARD (with Variable Reward)
// ============================================
function loadInsight() {
    const insight = getDailyInsight();
    const auraScore = generateAuraScore();
    // If user has a mood today, prefer an insight that transforms negative moods to positive
    const userMood = localStorage.getItem("aura_user_mood");
    const moodBasedInsight = mapInsightForMood(userMood, insight);

    document.getElementById("insightTitle").textContent = moodBasedInsight.title;
    document.getElementById("insightDescription").textContent = moodBasedInsight.description;
    document.getElementById("auraScore").textContent = auraScore;

    track("insight_viewed", { 
        insight_title: moodBasedInsight.title,
        aura_score: auraScore
    });
}

// Map mood -> supportive insight (prefer transformation for negative moods)
function mapInsightForMood(mood, defaultInsight) {
    if (!mood) return defaultInsight;

    const negativeMoods = ["stressed", "confused", "lonely", "overwhelmed"];
    const positiveFallbacks = {
        stressed: "The Recovery Card",
        confused: "The Clarity Card",
        lonely: "The Confidence Card",
        overwhelmed: "The Recovery Card"
    };

    if (negativeMoods.includes(mood)) {
        const targetTitle = positiveFallbacks[mood] || defaultInsight.title;
        const found = insights.find(i => i.title === targetTitle);
        return found || defaultInsight;
    }

    // For positive moods, nudge to more energy/ambition
    const positiveMoods = ["energized", "confident", "calm"];
    if (positiveMoods.includes(mood)) {
        const found = insights.find(i => i.title === "The Ambition Card") || defaultInsight;
        return found;
    }

    return defaultInsight;
}

// ============================================
// EVENT LISTENER SETUP
// ============================================
function initializeEventListeners() {
    const refreshBtn = document.getElementById("refreshInsightBtn");
    const saveBtn = document.getElementById("saveInsightBtn");
    const signupCtaBtn = document.getElementById("signupCtaBtn");
    const submitBtn = document.getElementById("submitBtn");
    const savePersonalizationBtn = document.getElementById("savePersonalizationBtn");
    const editProfileBtn = document.getElementById("editProfileBtn");
    const stressLevel = document.getElementById("stressLevel");
    const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");

    refreshBtn.addEventListener("click", handleRefreshInsight);
    saveBtn.addEventListener("click", handleSaveInsight);
    signupCtaBtn?.addEventListener("click", handleSignupCta);
    submitBtn.addEventListener("click", handleFormSubmit);
    savePersonalizationBtn?.addEventListener("click", handleSavePersonalization);
    editProfileBtn?.addEventListener("click", handleEditProfile);
    stressLevel?.addEventListener("input", (e) => updateStressLabel(e.target.value));
    toggleHistoryBtn?.addEventListener("click", toggleHistory);

    // Initialize waitlist handler if the button exists anywhere in the DOM
    const joinWaitlistBtn = document.getElementById("joinWaitlistBtn");
    if (joinWaitlistBtn) {
        initializeWaitlist();
    }
}

// ============================================
// EVENT HANDLERS
// ============================================
async function handleRefreshInsight() {
    localStorage.removeItem("aura_insight_date");
    localStorage.removeItem("aura_insight_index");
    
    loadInsight();
    incrementEngagement();
    track("insight_refreshed");
    
    // If user is signed up, save this new insight
    if (isUserSignedUp()) {
        await saveDailyAnalysis();
    }
}

async function handleSaveInsight() {
    incrementEngagement();
    track("insight_saved");
    
    // If user is signed up, save to daily_analyses
    if (isUserSignedUp()) {
        await saveDailyAnalysis();
    }
    
    checkSignupTrigger();
}

function handleSignupCta() {
    const ctaSection = document.getElementById("ctaSection");
    const signupSection = document.getElementById("signupSection");
    
    ctaSection.classList.add("hidden");
    signupSection.classList.remove("hidden");
    track("signup_cta_clicked");
}

function updateStressLabel(value) {
    const stressLabel = document.getElementById("stressLabel");
    const labels = ["Low", "Low", "Low", "Medium", "Medium", "Medium", "High", "High", "High", "Very High"];
    stressLabel.textContent = labels[parseInt(value) - 1] || "Medium";
}

async function handleSavePersonalization() {
    const userData = getUserData();
    const mood = document.getElementById("moodSelect").value;
    const stress = document.getElementById("stressLevel").value;
    const relationship = document.getElementById("relationshipSelect").value;
    const intent = document.getElementById("intentSelect").value;

    // Save to localStorage
    localStorage.setItem("aura_user_mood", mood);
    localStorage.setItem("aura_user_stress", stress);
    localStorage.setItem("aura_user_relationship", relationship);
    localStorage.setItem("aura_user_intent", intent);
    localStorage.setItem("aura_personalization_filled_today", "true");

    // Save to Supabase
    try {
        const { error } = await db
            .from("users")
            .update({
                mood: mood || null,
                stress_level: stress ? parseInt(stress) : null,
                relationship_status: relationship || null,
                daily_intent: intent || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", userData.id);

        if (error) {
            console.error("Update error:", error);
        } else {
            track("personalization_saved", { mood, stress, relationship, intent });
            
            // Switch to summary view
            const personalizationForm = document.getElementById("personalizationForm");
            const personalizationSummary = document.getElementById("personalizationSummary");
            personalizationForm.classList.add("hidden");
            personalizationSummary.classList.remove("hidden");
            // Update summary using the newest values saved to localStorage
            updatePersonalizationSummary(getUserData());
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

function handleEditProfile() {
    const personalizationForm = document.getElementById("personalizationForm");
    const personalizationSummary = document.getElementById("personalizationSummary");
    personalizationForm.classList.remove("hidden");
    personalizationSummary.classList.add("hidden");
}

async function handleFormSubmit() {
    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();

    // Allow lightweight signup: if name is empty, use a friendly fallback to reduce friction
    const finalName = name || "Friend";

    try {
        // Insert user data into Supabase
        const { data, error } = await db
            .from("users")
            .insert([
                {
                    anon_id: anon_id,
                    name: finalName,
                    phone: phone || null,
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error("Supabase error:", error);
            alert("Something went wrong. Please try again.");
            track("user_signup_failed", { error: error.message });
            return;
        }

        // Save to localStorage
        const userId = data[0].id;
        localStorage.setItem("aura_user_id", userId);
        localStorage.setItem("aura_user_name", name);
        localStorage.setItem("aura_user_phone", phone);

        alert("Welcome to The Aura! 🌟");
        track("user_signup_success", { 
            name, 
            phone: phone ? "provided" : "not_provided",
            engagement_count: localStorage.getItem("aura_engagement_count") || "0"
        });

        // Reload to show profile view
        window.location.reload();
    } catch (error) {
        console.error("Error:", error);
        alert("An unexpected error occurred.");
    }
}

// ============================================
// SAVE DAILY ANALYSIS TO SUPABASE
// ============================================
async function saveDailyAnalysis() {
    const userData = getUserData();
    const insight = getDailyInsight();
    const auraScore = parseInt(document.getElementById("auraScore").textContent);
    
    // Check if already saved today
    const today = new Date().toDateString();
    const lastSaveDate = localStorage.getItem("aura_last_save_date");
    
    if (lastSaveDate === today) {
        // Already saved today, don't save again
        return;
    }

    try {
        const { error } = await db
            .from("daily_analyses")
            .insert([
                {
                    user_id: userData.id,
                    aura_score: auraScore,
                    insight_title: insight.title,
                    insight_description: insight.description,
                    mood: localStorage.getItem("aura_user_mood") || null,
                    stress_level: localStorage.getItem("aura_user_stress") ? parseInt(localStorage.getItem("aura_user_stress")) : null,
                    relationship_status: localStorage.getItem("aura_user_relationship") || null,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error("Error saving daily analysis:", error);
        } else {
            localStorage.setItem("aura_last_save_date", today);
            track("daily_analysis_saved", { aura_score, insight_title: insight.title });
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
function checkSignupTrigger() {
    const alreadySignedUp = isUserSignedUp();
    const engagement = parseInt(localStorage.getItem("aura_engagement_count") || "0");
    const ctaSection = document.getElementById("ctaSection");

    if (!alreadySignedUp && engagement >= 2) {
        ctaSection.classList.remove("hidden");
        track("signup_prompt_shown", { engagement_count: engagement });
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
// HISTORY TOGGLE
// ============================================
function toggleHistory() {
    const pastAnalysesList = document.getElementById("pastAnalysesList");
    const historyToggleIcon = document.getElementById("historyToggleIcon");
    
    pastAnalysesList.classList.toggle("hidden");
    historyToggleIcon.textContent = pastAnalysesList.classList.contains("hidden") ? "▼" : "▲";
}

// ============================================
// LOAD PAST ANALYSES
// ============================================
async function loadPastAnalyses() {
    const userData = getUserData();
    const pastAnalysesSection = document.getElementById("pastAnalysesSection");
    const pastAnalysesList = document.getElementById("pastAnalysesList");

    try {
        const { data, error } = await db
            .from("daily_analyses")
            .select("*")
            .eq("user_id", userData.id)
            .order("created_at", { ascending: false })
            .limit(7);

        if (error) {
            console.error("Error loading past analyses:", error);
            return;
        }

        if (!data || data.length === 0) {
            // Show empty state
            pastAnalysesSection.classList.remove("hidden");
            pastAnalysesList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <p class="text-sm">No analyses yet. Save your first reading to start building your aura history.</p>
                </div>
            `;
            return;
        }

        pastAnalysesSection.classList.remove("hidden");
        pastAnalysesList.innerHTML = data.map(analysis => `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <p class="font-semibold text-sm text-gray-800">${analysis.insight_title}</p>
                        <p class="text-xs text-gray-600 mt-1">${new Date(analysis.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text">${analysis.aura_score}</span>
                    </div>
                </div>
                ${analysis.mood ? `<p class="text-xs text-purple-600 mt-2">Mood: <span class="capitalize">${analysis.mood}</span></p>` : ''}
            </div>
        `).join("");
    } catch (error) {
        console.error("Error loading past analyses:", error);
    }
}

// ============================================
// NOTIFICATION TOGGLE
// ============================================
function initializeNotificationToggle() {
    const notificationToggle = document.getElementById("notificationToggle");
    const notificationsEnabled = localStorage.getItem("aura_notifications_enabled") === "true";

    if (notificationsEnabled) {
        notificationToggle.classList.add("bg-purple-500");
        notificationToggle.querySelector("span").classList.add("translate-x-5");
        notificationToggle.querySelector("span").classList.remove("translate-x-1");
    }

    notificationToggle.addEventListener("click", () => {
        const isCurrentlyEnabled = localStorage.getItem("aura_notifications_enabled") === "true";
        const newState = !isCurrentlyEnabled;

        localStorage.setItem("aura_notifications_enabled", newState);

        if (newState) {
            notificationToggle.classList.add("bg-purple-500");
            notificationToggle.classList.remove("bg-gray-300");
            notificationToggle.querySelector("span").classList.add("translate-x-5");
            notificationToggle.querySelector("span").classList.remove("translate-x-1");
            track("notifications_enabled");
        } else {
            notificationToggle.classList.remove("bg-purple-500");
            notificationToggle.classList.add("bg-gray-300");
            notificationToggle.querySelector("span").classList.remove("translate-x-5");
            notificationToggle.querySelector("span").classList.add("translate-x-1");
            track("notifications_disabled");
        }
    });
}

// ============================================
// WAITLIST
// ============================================
function initializeWaitlist() {
    const joinWaitlistBtn = document.getElementById("joinWaitlistBtn");
    const isOnWaitlist = localStorage.getItem("aura_waitlist_joined") === "true";

    if (isOnWaitlist) {
        joinWaitlistBtn.textContent = "✓ You're on the Waitlist";
        joinWaitlistBtn.disabled = true;
        joinWaitlistBtn.classList.add("opacity-70");
    }

    joinWaitlistBtn.addEventListener("click", async () => {
        const userData = getUserData();

        try {
            // Save to waitlist in Supabase (we'll extend the users table later)
            const { error } = await db
                .from("users")
                .update({
                    waitlist_joined: true,
                    updated_at: new Date().toISOString()
                })
                .eq("id", userData.id);

            if (error) {
                console.error("Error joining waitlist:", error);
                return;
            }

            localStorage.setItem("aura_waitlist_joined", "true");
            joinWaitlistBtn.textContent = "✓ You're on the Waitlist";
            joinWaitlistBtn.disabled = true;
            joinWaitlistBtn.classList.add("opacity-70");

            track("waitlist_joined");
        } catch (error) {
            console.error("Error:", error);
        }
    });
}