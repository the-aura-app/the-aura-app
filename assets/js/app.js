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
let messageCount = 0;
let conversationState = 'greeting'; // greeting, chatting, asking_name, asking_phone, complete
let userName = null;

// ============================================
// CONVERSATION DATA
// ============================================
const greetings = {
    morning: {
        great: "Good morning! Your energy is radiating today.",
        okay: "Morning. Let's see what today brings.",
        stressed: "Morning. I can feel the weight already. Take a breath with me.",
        overwhelmed: "Hey. I know mornings are hard. I'm here."
    },
    afternoon: {
        great: "You're glowing today. Keep that energy.",
        okay: "Afternoon check-in. How's your mental space?",
        stressed: "Corporate life getting heavy? I see you.",
        overwhelmed: "You've been running on empty. Let's pause."
    },
    evening: {
        great: "You made it through beautifully.",
        okay: "Evening thoughts? Let's decode them.",
        stressed: "The day took its toll. You're allowed to be tired.",
        overwhelmed: "I know you're drained. Talk to me."
    }
};

const moodInsights = {
    great: {
        message: "I can feel your energy from here. This is your moment.",
        insight: "Channel this momentum into something that matters. Your gut is aligned with your goals right now. Trust it.",
        score: 87
    },
    okay: {
        message: "You're in a neutral space. That's actually a good place to be.",
        insight: "This calm means you can see things clearly. Use it to make decisions that usually feel clouded.",
        score: 70
    },
    stressed: {
        message: "I hear you. That weight on your shoulders is real.",
        insight: "Someone's energy is draining yours. It's not selfish to protect your peace. A simple 'no' today saves hours of regret tomorrow.",
        score: 48,
        boost: 68
    },
    overwhelmed: {
        message: "You're allowed to feel this way. You're allowed to be tired.",
        insight: "You don't have to do everything today. Release what's not in your control. Your worth isn't tied to your productivity.",
        score: 42,
        boost: 65
    }
};

// ============================================
// INTELLIGENT RESPONSE PATTERNS
// ============================================
const responsePatterns = [
    {
        keywords: ['work', 'job', 'office', 'boss', 'colleague', 'meeting', 'project', 'deadline'],
        responses: [
            "Work stress is real. You're not overthinking it. What specifically is weighing on you?",
            "Corporate life can drain your soul if you let it. What boundary needs to be set?",
            "Your worth isn't measured by your productivity. Remember that.",
            "That work situation? Trust your gut. If it feels off, it probably is."
        ]
    },
    {
        keywords: ['boyfriend', 'relationship', 'him', 'dating', 'love', 'partner', 'guy'],
        responses: [
            "If you're confused about him, it's not about you being unclear. It's about him being unclear.",
            "Your intuition about this relationship is probably right. What is your gut telling you?",
            "You deserve someone who makes you feel secure, not confused.",
            "That relationship uncertainty? It's telling you something. Listen to it."
        ]
    },
    {
        keywords: ['tired', 'exhausted', 'sleep', 'rest', 'burnout', 'drained'],
        responses: [
            "Your body is screaming for rest. The world won't collapse if you slow down.",
            "Being tired isn't weakness. It's your body's way of protecting you.",
            "You've been running on empty. Today is a permission slip to rest.",
            "Exhaustion is not a badge of honor. Rest is productive too."
        ]
    },
    {
        keywords: ['anxious', 'anxiety', 'worry', 'scared', 'nervous', 'panic'],
        responses: [
            "That anxiety you're feeling? It's your mind trying to protect you. But you're safe right now.",
            "You've handled anxiety before and survived. You'll handle this too.",
            "Anxiety lies to you. The catastrophe in your head isn't happening in reality.",
            "Take three deep breaths with me. You're going to be okay."
        ]
    },
    {
        keywords: ['family', 'parents', 'mom', 'dad', 'home', 'marriage pressure'],
        responses: [
            "Family pressure is heavy, especially around marriage. Your timeline is yours.",
            "You don't owe anyone an explanation for your life choices.",
            "Your parents' expectations aren't your responsibility. You're living your life, not theirs.",
            "Setting boundaries with family is hard but necessary. You're allowed to."
        ]
    },
    {
        keywords: ['lonely', 'alone', 'friends', 'isolated', 'nobody'],
        responses: [
            "Loneliness is hard. But you're not as alone as you feel right now.",
            "Your presence matters more than you know. You just can't see it today.",
            "Sometimes the loneliest moments teach us the most about ourselves.",
            "Solitude isn't the same as loneliness. Can you use this time for you?"
        ]
    },
    {
        keywords: ['future', 'career', 'decision', 'choice', 'confused', 'should i'],
        responses: [
            "Clarity comes from action, not overthinking. What's your gut saying?",
            "You don't need all the answers right now. Just take the next step.",
            "That decision? Your hesitation is telling you something. What is it?",
            "Trust yourself. You've made good decisions before. You'll make them again."
        ]
    }
];

const fallbackResponses = [
    "I hear you. Tell me more about that.",
    "That sounds heavy. How long have you been feeling this way?",
    "Your feelings are valid. What would help right now?",
    "I'm listening. What else is on your mind?",
    "You're being really honest with yourself. That takes courage.",
    "Sometimes just saying it out loud helps. I'm here."
];

// ============================================
// UTILITIES
// ============================================
const getTimeOfDay = () => {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 19 ? "afternoon" : "evening";
};

const isSignedUp = () => !!localStorage.getItem("aura_user_id");

const getUserData = () => ({
    id: localStorage.getItem("aura_user_id"),
    name: localStorage.getItem("aura_user_name"),
    phone: localStorage.getItem("aura_user_phone")
});

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
            console.error("Streak error:", err);
        }
    }

    return streak;
};

// ============================================
// CHAT FUNCTIONS
// ============================================
const addMessage = (text, isUser = false, showScore = false, score = null) => {
    const chatMessages = document.getElementById('chatMessages');
    
    // Clear initial placeholder
    if (chatMessages.querySelector('.text-center')) {
        chatMessages.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] px-4 py-3 rounded-2xl ${
        isUser 
            ? 'bg-purple-500 text-white rounded-br-none' 
            : 'bg-white text-gray-800 rounded-bl-none border border-purple-100'
    }`;
    
    if (showScore && score) {
        bubble.innerHTML = `
            <p class="text-sm mb-2">${text}</p>
            <div class="flex items-center justify-between mt-3 pt-3 border-t ${isUser ? 'border-purple-400' : 'border-purple-200'}">
                <span class="text-xs ${isUser ? 'text-purple-200' : 'text-gray-500'}">Your Aura Score</span>
                <span class="text-2xl font-bold ${isUser ? 'text-white' : 'text-purple-600'}">${score}</span>
            </div>
        `;
    } else {
        bubble.innerHTML = `<p class="text-sm">${text}</p>`;
    }
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const getIntelligentResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check patterns
    for (const pattern of responsePatterns) {
        if (pattern.keywords.some(kw => lowerMessage.includes(kw))) {
            return pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
        }
    }
    
    // Fallback
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

const saveConversation = async (userMsg, auraResponse, mood) => {
    if (!isSignedUp()) return;
    
    try {
        await db.from("conversations").insert([{
            user_id: getUserData().id,
            user_message: userMsg,
            aura_response: auraResponse,
            mood: mood,
            created_at: new Date().toISOString()
        }]);
    } catch (err) {
        console.error("Save conversation error:", err);
    }
};

const handleUserMessage = async () => {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    addMessage(message, true);
    messageCount++;
    
    // Simulate typing delay
    setTimeout(async () => {
        let response = '';
        
        // State machine for conversation flow
        if (conversationState === 'chatting') {
            if (messageCount >= 3 && !isSignedUp()) {
                conversationState = 'asking_name';
                response = "I feel like we're connecting here. What should I call you? (Just your name is fine 😊)";
            } else {
                response = getIntelligentResponse(message);
                if (isSignedUp()) {
                    await saveConversation(message, response, currentMood);
                }
            }
        } else if (conversationState === 'asking_name') {
            userName = message.split(' ')[0]; // Take first name only
            conversationState = 'asking_phone';
            response = `Beautiful name, ${userName}. Would you like daily check-ins via text? Share your number, or just say "skip" if you prefer not to. 💜`;
        } else if (conversationState === 'asking_phone') {
            const phone = message.toLowerCase() === 'skip' ? null : message.trim();
            await createUser(userName, phone);
            conversationState = 'complete';
            response = `Perfect! I'll remember you now, ${userName}. You can always come back here when you need to talk. 💜`;
        }
        
        addMessage(response, false);
        track('message_sent', { state: conversationState, message_count: messageCount });
    }, 800);
};

const createUser = async (name, phone) => {
    try {
        const { data, error } = await db.from("users").insert([{
            anon_id: anonId,
            name: name,
            phone: phone,
            current_mood: currentMood,
            created_at: new Date().toISOString()
        }]).select();
        
        if (error) throw error;
        
        localStorage.setItem("aura_user_id", data[0].id);
        localStorage.setItem("aura_user_name", name);
        if (phone) localStorage.setItem("aura_user_phone", phone);
        
        track("user_signup_success", { name, has_phone: !!phone });
        
        // Reload UI
        setTimeout(() => location.reload(), 2000);
    } catch (err) {
        console.error("Signup error:", err);
        addMessage("Oops, something went wrong. But I'm still here listening to you. 💜", false);
    }
};

// ============================================
// RENDER FUNCTIONS
// ============================================
const renderGreeting = () => {
    const time = getTimeOfDay();
    const mood = currentMood || 'okay';
    document.getElementById("greeting").textContent = greetings[time][mood];
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
            .from("conversations")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
        
        if (error) throw error;
        if (!data || data.length === 0) return;
        
        document.getElementById("historySection").classList.remove("hidden");
        
        const list = document.getElementById("historyList");
        list.innerHTML = data.map(item => `
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <span class="text-xs font-semibold text-purple-600 capitalize">${item.mood}</span>
                </div>
                <p class="text-xs text-gray-600 mb-1">You: <span class="italic">"${item.user_message.substring(0, 60)}..."</span></p>
                <p class="text-xs text-purple-700">Aura: <span class="italic">"${item.aura_response.substring(0, 60)}..."</span></p>
            </div>
        `).join("");
    } catch (err) {
        console.error("History error:", err);
    }
};

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    track("app_loaded");
    track("daily_active");
    
    renderGreeting();
    
    if (isSignedUp()) {
        const user = getUserData();
        userName = user.name;
        conversationState = 'complete';
        await renderJourney();
        await loadHistory();
        
        // Enable chat immediately for returning users
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
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
        
        // Update greeting
        renderGreeting();
        
        // Send mood insight
        const insight = moodInsights[currentMood];
        addMessage(insight.message, false);
        
        setTimeout(() => {
            addMessage(insight.insight, false, true, insight.score);
            
            // Show score boost for negative moods
            if (insight.boost) {
                setTimeout(() => {
                    addMessage(`✨ Reading this shifted your energy. Your new score: ${insight.boost}`, false);
                }, 2000);
            }
        }, 1000);
        
        // Enable chat
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        
        conversationState = 'chatting';
        track("mood_selected", { mood: currentMood });
    });
});

// Send message
document.getElementById('sendBtn').addEventListener('click', handleUserMessage);
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserMessage();
});

// History toggle
document.getElementById('toggleHistory')?.addEventListener("click", () => {
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
});