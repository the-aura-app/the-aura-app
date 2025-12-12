// ============================================
// CONFIG & INIT
// ============================================
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let anonId = localStorage.getItem("aura_anon_id") || crypto.randomUUID();
localStorage.setItem("aura_anon_id", anonId);

const track = (event, data = {}) => posthog.capture(event, { anon_id: anonId, ...data });

let currentMood = null;
let initialScore = 0;

// ============================================
// EMPATHETIC CONTENT (Mood-based)
// ============================================
const greetings = {
    morning: {
        great: "Good morning, sunshine! Your energy is radiating today.",
        okay: "Morning. Let's see what today has in store for you.",
        stressed: "Morning. I can feel the weight already. Let's ease into this.",
        overwhelmed: "Hey. I know mornings are hard. Take a breath with me."
    },
    afternoon: {
        great: "You're glowing today. Keep that energy going.",
        okay: "Afternoon check-in. How's your mental space?",
        stressed: "Corporate life getting heavy? I see you.",
        overwhelmed: "You've been running on empty. Let's pause here."
    },
    evening: {
        great: "You made it through beautifully. That's strength.",
        okay: "Evening thoughts kicking in? Let's decode them.",
        stressed: "The day's taking its toll. You're allowed to be tired.",
        overwhelmed: "I know you're emotionally drained. Talk to me."
    }
};

const insights = {
    great: [
        { title: "The Momentum Card", desc: "This energy you have? It's rare. Channel it into something that matters to you today. Your gut is aligned with your goals right now.", score: 85 },
        { title: "The Confidence Card", desc: "That thing you're doubting? You're better at it than you realize. Trust your instincts today - they're sharp.", score: 88 },
        { title: "The Ambition Card", desc: "Your career move? Now's the time. Your gut is telling you because the timing is actually right. Go for it.", score: 82 }
    ],
    okay: [
        { title: "The Clarity Card", desc: "You're in a neutral space, which means you can see things clearly right now. Use this calm to make decisions that usually feel clouded.", score: 68 },
        { title: "The Intuition Card", desc: "Your inner voice is speaking today. That project or person you're thinking about? Trust what you feel in your gut.", score: 72 },
        { title: "The Balance Card", desc: "You're steady today. Not high, not low. This is the perfect space to handle the things you've been avoiding.", score: 70 }
    ],
    stressed: [
        { title: "The Boundary Card", desc: "Someone's energy is draining yours. It's not selfish to protect your peace. A simple 'no' today saves hours of regret tomorrow.", score: 45, boost: 65 },
        { title: "The Recovery Card", desc: "You've been running on fumes. This feeling is your body telling you to slow down. The world won't collapse if you rest.", score: 42, boost: 62 },
        { title: "The Perspective Card", desc: "This stress? It's temporary. You've handled harder things and survived. This too shall pass.", score: 48, boost: 68 }
    ],
    overwhelmed: [
        { title: "The Release Card", desc: "You don't have to do everything today. Release what's not in your control. Your worth isn't tied to your productivity.", score: 35, boost: 58 },
        { title: "The Truth Card", desc: "That relationship confusion? It's not about you being unclear. It's about him being unclear. Accept that and move forward.", score: 38, boost: 60 },
        { title: "The Permission Card", desc: "You're allowed to feel this way. You're allowed to be tired, frustrated, or done. Your emotions are valid.", score: 40, boost: 63 }
    ]
};

// ============================================
// UTILITIES
// ============================================
const getTimeOfDay = () => {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 19 ? "afternoon" : "evening";
};

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

const isSignedUp = () => !!localStorage.getItem("aura_user_id");

const getUserData = () => ({
    id: localStorage.getItem("aura_user_id"),
    name: localStorage.getItem("aura_user_name"),
    phone: localStorage.getItem("aura_user_phone")
});

const getEngagement = () => parseInt(localStorage.getItem("aura_engagement") || "0");
const incEngagement = () => {
    const e = getEngagement() + 1;
    localStorage.setItem("aura_engagement", e);
    return e;
};

// ============================================
// STREAK TRACKING
// ============================================
const updateStreak = async () => {
    const lastVisit = localStorage.getItem("aura_last_visit");
    const today = new Date().toDateString();
    let streak = parseInt(localStorage.getItem("aura_streak") || "0");

    if (!lastVisit) {
        streak = 1;
    } else if (lastVisit !== today) {
        const lastDate = new Date(lastVisit);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        streak = diffDays === 1 ? streak + 1 : 1;
    }

    localStorage.setItem("aura_streak", streak);
    localStorage.setItem("aura_last_visit", today);

    if (isSignedUp()) {
        try {
            await db.from("users").update({ 
                streak_count: streak, 
                last_visit_date: today, 
                updated_at: new Date().toISOString() 
            }).eq("id", getUserData().id);
        } catch (err) {
            console.error("Streak update error:", err);
        }
    }

    return streak;
};

// ============================================
// RENDER FUNCTIONS
// ============================================
const renderGreeting = (mood = 'okay') => {
    const time = getTimeOfDay();
    const greeting = greetings[time][mood];
    document.getElementById("greeting").textContent = greeting;
};

const renderInsight = (mood = 'okay') => {
    const moodInsights = insights[mood];
    const insight = randomFrom(moodInsights);
    
    initialScore = insight.score;
    document.getElementById("insightTitle").textContent = insight.title;
    document.getElementById("insightDesc").textContent = insight.desc;
    document.getElementById("auraScore").textContent = insight.score;
    
    // Store for potential boost
    if (insight.boost) {
        localStorage.setItem("aura_boost_available", insight.boost);
    } else {
        localStorage.removeItem("aura_boost_available");
    }
    
    track("insight_viewed", { mood, title: insight.title, score: insight.score });
};

const showMoodBoost = () => {
    const boost = localStorage.getItem("aura_boost_available");
    if (!boost) return;
    
    setTimeout(() => {
        const boostEl = document.getElementById("moodBoost");
        const boostedScoreEl = document.getElementById("boostedScore");
        const scoreCircle = document.getElementById("scoreCircle");
        
        boostEl.classList.remove("hidden");
        boostedScoreEl.textContent = boost;
        
        // Animate score change
        let current = initialScore;
        const target = parseInt(boost);
        const step = (target - current) / 20;
        
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            document.getElementById("auraScore").textContent = Math.round(current);
        }, 50);
        
        // Add visual feedback
        scoreCircle.classList.add("border-green-400");
        track("mood_boosted", { initial: initialScore, boosted: boost });
    }, 3000);
};

const renderJourney = async () => {
    if (!isSignedUp()) return;
    
    const user = getUserData();
    const streak = await updateStreak();
    
    document.getElementById("userName").textContent = user.name;
    document.getElementById("streakDays").textContent = streak;
    document.getElementById("journeySection").classList.remove("hidden");
};

const loadHistory = async () => {
    if (!isSignedUp()) return;
    
    const user = getUserData();
    try {
        const { data, error } = await db
            .from("expressions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const section = document.getElementById("historySection");
        const list = document.getElementById("historyList");
        
        if (!data || data.length === 0) return;
        
        section.classList.remove("hidden");
        
        list.innerHTML = data.map(item => `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <span class="text-sm font-semibold text-purple-600 capitalize">${item.mood}</span>
                </div>
                <p class="text-sm text-gray-700 italic">"${item.expression.substring(0, 100)}${item.expression.length > 100 ? '...' : ''}"</p>
            </div>
        `).join("");
    } catch (err) {
        console.error("History load error:", err);
    }
};

// ============================================
// SAVE EXPRESSION
// ============================================
const saveExpression = async (text, mood) => {
    if (!isSignedUp()) return;
    
    const user = getUserData();
    try {
        await db.from("expressions").insert([{
            user_id: user.id,
            expression: text,
            mood: mood,
            created_at: new Date().toISOString()
        }]);
        
        track("expression_shared", { mood, length: text.length });
        await loadHistory();
    } catch (err) {
        console.error("Save expression error:", err);
    }
};

// ============================================
// SHOW GENTLE SIGNUP
// ============================================
const checkGentleSignup = () => {
    if (!isSignedUp() && getEngagement() >= 2) {
        document.getElementById("gentleSignup").classList.remove("hidden");
        track("gentle_signup_shown", { engagement: getEngagement() });
    }
};

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    track("app_loaded");
    track("daily_active");
    
    renderGreeting();
    renderInsight();
    
    if (isSignedUp()) {
        await renderJourney();
        await loadHistory();
    }
    
    // Waitlist state
    if (localStorage.getItem("aura_waitlist") === "true") {
        const btn = document.getElementById("waitlistBtn");
        btn.textContent = "✓ You're on the list";
        btn.disabled = true;
        btn.classList.add("opacity-70");
    }
});

// Mood selection
document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentMood = btn.dataset.mood;
        
        // Visual feedback
        document.querySelectorAll(".mood-btn").forEach(b => {
            b.classList.remove("border-purple-500", "bg-purple-100");
        });
        btn.classList.add("border-purple-500", "bg-purple-100");
        
        // Update greeting and insight
        renderGreeting(currentMood);
        renderInsight(currentMood);
        showMoodBoost();
        
        incEngagement();
        track("mood_selected", { mood: currentMood });
        
        // Save mood if signed up
        if (isSignedUp()) {
            db.from("users").update({ 
                current_mood: currentMood,
                updated_at: new Date().toISOString() 
            }).eq("id", getUserData().id).catch(console.error);
        }
    });
});

// Rescan button
document.getElementById("rescanBtn").addEventListener("click", () => {
    const mood = currentMood || 'okay';
    renderInsight(mood);
    showMoodBoost();
    incEngagement();
    track("aura_rescanned", { mood });
});

// Expression sharing
document.getElementById("expressBtn").addEventListener("click", async () => {
    const text = document.getElementById("expressionBox").value.trim();
    if (!text) return;
    
    const mood = currentMood || 'okay';
    
    incEngagement();
    track("expression_shared", { mood, has_text: true });
    
    if (isSignedUp()) {
        await saveExpression(text, mood);
        document.getElementById("expressionBox").value = "";
        alert("Thank you for sharing. I hear you. 💜");
    } else {
        checkGentleSignup();
        alert("I hear you. Create an account to save your thoughts? 💜");
    }
});

// Signup
document.getElementById("signupBtn").addEventListener("click", async () => {
    const name = document.getElementById("nameInput").value.trim() || "Friend";
    const phone = document.getElementById("phoneInput").value.trim();
    
    try {
        const { data, error } = await db.from("users").insert([{
            anon_id: anonId,
            name,
            phone: phone || null,
            current_mood: currentMood,
            created_at: new Date().toISOString()
        }]).select();
        
        if (error) throw error;
        
        localStorage.setItem("aura_user_id", data[0].id);
        localStorage.setItem("aura_user_name", name);
        if (phone) localStorage.setItem("aura_user_phone", phone);
        
        track("user_signup_success", { name, phone: phone ? "yes" : "no", mood: currentMood });
        alert(`Welcome, ${name}! I'll remember you now. 💜`);
        location.reload();
    } catch (err) {
        console.error("Signup error:", err);
        track("user_signup_failed", { error: err.message });
        alert("Something went wrong. Please try again.");
    }
});

// History toggle
document.getElementById("toggleHistory")?.addEventListener("click", () => {
    const list = document.getElementById("historyList");
    const icon = document.getElementById("historyIcon");
    list.classList.toggle("hidden");
    icon.textContent = list.classList.contains("hidden") ? "▼" : "▲";
});

// Waitlist
document.getElementById("waitlistBtn").addEventListener("click", async () => {
    localStorage.setItem("aura_waitlist", "true");
    const btn = document.getElementById("waitlistBtn");
    btn.textContent = "✓ You're on the list";
    btn.disabled = true;
    btn.classList.add("opacity-70");
    
    if (isSignedUp()) {
        try {
            await db.from("users").update({ 
                waitlist_joined: true, 
                updated_at: new Date().toISOString() 
            }).eq("id", getUserData().id);
        } catch (err) {
            console.error("Waitlist error:", err);
        }
    }
    
    track("waitlist_joined");
    alert("You're on the list! We'll reach out soon. 💜");
});