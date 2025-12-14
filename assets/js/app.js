// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Replace with your actual Project URL and ANON Key
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM"; // The one starting with eyJ...
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/hyper-function`;

let db = null;
try {
    // Ensure you have the Supabase script loaded in your HTML
    if (window.supabase) {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch(e) {
    console.warn('Supabase Init Error:', e.message);
}

// ============================================
// STATE
// ============================================
let state = {
    userId: null,
    anonId: crypto.randomUUID(),
    currentMood: null,
    auraScore: 50,
    interactionCount: 0,
    askedForName: false,
    askedForPhone: false,
    userName: null,
    userPhone: null,
    conversationHistory: [],
    emotionalArc: [50]
};

// ============================================
// SUPABASE DATABASE HELPERS
// ============================================
const initUser = async () => {
    if (!db) return;
    try {
        const { data, error } = await db.from('users').insert([{ anon_id: state.anonId }]).select();
        if (!error && data?.[0]) state.userId = data[0].id;
    } catch(err) {
        console.warn('Init:', err.message);
    }
};

const saveConversation = async (userMsg, auraMsg, msgType = 'interaction') => {
    if (!db || !state.userId) return;
    try {
        await db.from('conversations').insert([{
            user_id: state.userId,
            user_message: userMsg,
            aura_response: auraMsg || '',
            message_type: msgType,
            mood: state.currentMood || null
        }]);
    } catch(err) {
        console.warn('Save:', err.message);
    }
};

const updateUserInfo = async (updates) => {
    if (!db || !state.userId) return;
    try {
        await db.from('users').update(updates).eq('id', state.userId);
    } catch(err) {
        console.warn('Update:', err.message);
    }
};

// ============================================
// AI GENERATION (VIA SUPABASE EDGE FUNCTION)
// ============================================
const generateWithAI = async (prompt) => {
    try {
        console.log("Asking AI..."); // Debug log
        
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_KEY}` // Using Supabase Anon Key
            },
            body: JSON.stringify({ prompt: prompt }),
        });

        if (response.ok) {
            const result = await response.json();
            // Our Edge Function returns { response: "text" }
            return result.response || null;
        } else {
            console.error("AI Error Status:", response.status);
        }
    } catch (err) {
        console.warn('AI Network Error:', err.message);
    }
    return null;
};

// ============================================
// NLP + SENTIMENT
// ============================================
const keywordMap = {
    work: ['work', 'job', 'office', 'boss', 'deadline', 'team', 'project', 'career', 'code', 'dev'],
    relationship: ['boyfriend', 'girlfriend', 'partner', 'love', 'guy', 'girl', 'husband', 'wife'],
    health: ['tired', 'exhausted', 'sleep', 'rest', 'burnout', 'energy', 'mental', 'physical'],
    family: ['mom', 'dad', 'family', 'parents', 'home', 'sibling', 'brother', 'sister'],
    self: ['hate myself', 'stupid', 'failure', 'not good enough', 'worthy', 'capable']
};

const sentimentWords = {
    positive: ['good', 'great', 'happy', 'love', 'peaceful', 'calm', 'grateful', 'blessed', 'excited'],
    negative: ['bad', 'hate', 'angry', 'sad', 'tired', 'exhausted', 'overwhelmed', 'stuck', 'hopeless', 'scared']
};

const extractData = (text) => {
    const lower = text.toLowerCase();
    const topics = [];
    for (const [topic, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(kw => lower.includes(kw))) topics.push(topic);
    }
    
    let emotions = [];
    sentimentWords.positive.forEach(w => lower.includes(w) && emotions.push('positive'));
    sentimentWords.negative.forEach(w => lower.includes(w) && emotions.push('negative'));
    
    return { topics, emotions };
};

const analyzeSentiment = (text) => {
    const lower = text.toLowerCase();
    let score = 50;
    let intensity = 0;
    
    sentimentWords.positive.forEach(w => {
        if (lower.includes(w)) { score += 8; intensity++; }
    });
    sentimentWords.negative.forEach(w => {
        if (lower.includes(w)) { score -= 8; intensity++; }
    });
    
    if (text.includes('!!!') || /[A-Z]{3,}/.test(text)) intensity += 2;
    
    return { score: Math.max(0, Math.min(100, score)), intensity: Math.min(intensity, 5) };
};

const analyzeContext = () => {
    if (state.conversationHistory.length === 0) {
        return { dominantTopic: 'general', trend: 'stable', state: 'exploring', depth: 1 };
    }
    
    const recent = state.conversationHistory.slice(-6);
    const topicCount = {};
    let sentiments = [];
    
    recent.forEach(msg => {
        if (msg.role === 'user') {
            const { topics } = extractData(msg.content);
            const { score } = analyzeSentiment(msg.content);
            sentiments.push(score);
            topics.forEach(t => topicCount[t] = (topicCount[t] || 0) + 1);
        }
    });
    
    const dominantTopic = Object.keys(topicCount).sort((a, b) => topicCount[b] - topicCount[a])[0] || 'general';
    const trend = sentiments.length > 2 ? (sentiments[sentiments.length - 1] > sentiments[0] ? 'improving' : 'declining') : 'stable';
    const state_ = sentiments[sentiments.length - 1] > 60 ? 'positive' : sentiments[sentiments.length - 1] < 40 ? 'struggling' : 'neutral';
    
    return { dominantTopic, trend, state: state_, depth: state.conversationHistory.length / 2 };
};

// ============================================
// RESPONSE + QUESTION + CHOICES
// ============================================
const responseBank = {
    work: {
        positive: ["When work aligns with who you are—everything changes.", "That's rare. Hold onto it.", "Progress at work means something. You earned that.", "Your contribution matters.", "You're in your zone.", "This is competence.", "Keep that momentum."],
        struggling: ["Work shouldn't drain your soul.", "The pace is unsustainable.", "You're giving everything to a space that doesn't match your value.", "Your exhaustion is real.", "This isn't sustainable.", "You deserve better.", "The system is broken, not you."]
    },
    relationship: {
        positive: ["Connection like that is everything.", "Someone finally sees you.", "Real partnership is rare.", "This is what safe feels like.", "You're being known.", "They're choosing you."],
        struggling: ["You know what you need.", "You can't fix this alone.", "Love shouldn't feel like this much work.", "You're trying to bridge a gap they're not even looking at.", "Real love doesn't require you to disappear.", "You're not the problem."]
    },
    health: {
        positive: ["Honoring your body is honoring yourself.", "Rest isn't laziness.", "You're learning to listen to yourself.", "Recovery is underrated.", "Sleep is medicine.", "You're healing."],
        struggling: ["Your exhaustion is telling you something.", "You can't run on empty.", "Your health matters more than any deadline.", "Burnout is real and it's a signal.", "Your body is keeping score.", "Rest isn't optional. It's survival."]
    },
    family: {
        positive: ["Family that shows up—that's healing.", "You're building healthier patterns.", "Their support is grounding you.", "This connection is what roots us.", "You're being held.", "That's everything."],
        struggling: ["Family wounds cut deepest.", "You can love them and still need distance.", "Your peace matters more than their comfort.", "You're not responsible for their feelings.", "Setting boundaries isn't betrayal.", "You can honor them without abandoning yourself."]
    },
    self: {
        positive: ["You're finally believing what you deserved to believe.", "That voice in your head is right.", "You're claiming your own worth.", "Confidence looks good on you.", "You're writing your own story.", "You're becoming who you always were."],
        struggling: ["That voice telling you you're not enough is lying.", "You're comparing your day one to someone's day 1000.", "You're not broken. You're learning.", "Those stories about you—who wrote them? Not you.", "You're more capable than your anxiety says.", "You deserve the same grace you give others."]
    },
    general: {
        positive: ["Your energy is beautiful. 💜", "I feel you. Keep going.", "You're showing up. That's enough.", "This is what alignment feels like.", "You're exactly what you're meant to be."],
        struggling: ["The weight you're carrying is real. So is your strength.", "You don't have to be okay right now.", "You've survived every hard day. This is no different.", "It's okay to not have answers yet.", "You're allowed to struggle and still be strong."]
    }
};

const questionBank = {
    work: { shallow: "What's draining you?", deeper: "Are you staying from habit or hope?", hardest: "Would you leave if you could?" },
    relationship: { shallow: "What did they do?", deeper: "Do they see the real you?", hardest: "Is it time to walk away?" },
    health: { shallow: "When did this hit?", deeper: "What part of you needs rest?", hardest: "What would it take to actually stop?" },
    family: { shallow: "What hurt you?", deeper: "Can you set a boundary?", hardest: "Would distance make you happier?" },
    self: { shallow: "When did you start believing that?", deeper: "What would you tell a friend?", hardest: "What's the truth you're afraid to claim?" },
    general: { shallow: "What's going on?", deeper: "What haven't you said yet?", hardest: "What's the scariest part?" }
};

const choiceBank = {
    work: {
        "Would you leave if you could?": ["Yes, as soon as possible", "I want to, but I'm scared", "I don't know anymore"],
        "Are you staying from habit or hope?": ["Just habit at this point", "I keep hoping it'll get better", "I'm too tired to think about it"]
    },
    relationship: {
        "Is it time to walk away?": ["I think so, but I'm scared", "I don't want to give up", "Part of me wants to"],
        "Do they see the real you?": ["No, not really", "Sometimes, but it's rare", "Only what they want to see"]
    },
    health: {
        "What would it take to actually stop?": ["I don't know how to stop", "Permission from someone", "A complete breakdown, probably"],
        "What part of you needs rest?": ["All of me", "My mind, I can't focus", "Everything. I'm done"]
    },
    family: {
        "Would distance make you happier?": ["I think so, yes", "I feel guilty even thinking that", "Maybe, but I'd miss them"],
        "Can you set a boundary?": ["I've tried, they don't respect it", "I'm too scared to", "I don't know how"]
    },
    self: {
        "What's the truth you're afraid to claim?": ["That I'm actually capable", "That I'm worthy as I am", "That I deserve better"],
        "What would you tell a friend?": ["That they're being too hard on themselves", "That they're stronger than they think", "That they deserve compassion"]
    }
};

const generateResponse = async (text, topic, userState) => {
    const context = analyzeContext();
    const aiPrompt = `You are an empathetic coach. Person says: "${text}". Topic: ${topic}. State: ${userState}. Respond with ONE warm, validating sentence (under 20 words, no questions).`;
    
    // Call our new backend function
    const aiResponse = await generateWithAI(aiPrompt);
    
    if (aiResponse) return aiResponse;
    
    // Fallback if AI fails
    const pool = responseBank[topic] || responseBank.general;
    const responses = userState === 'positive' ? pool.positive : pool.struggling;
    return responses[Math.floor((state.conversationHistory.length % responses.length))];
};

const generateQuestion = async (text) => {
    const context = analyzeContext();
    const { score } = analyzeSentiment(text);
    const topic = context.dominantTopic;
    
    const aiPrompt = `Person says: "${text}". Ask ONE deep follow-up question. Maximum 15 words.`;
    
    // Call our new backend function
    const aiQuestion = await generateWithAI(aiPrompt);
    if (aiQuestion) return aiQuestion;
    
    // Fallback logic
    let depth = 'shallow';
    if (score < 35 && context.trend === 'declining') depth = 'hardest';
    else if (score < 45 && context.depth > 2) depth = 'deeper';
    
    return questionBank[topic]?.[depth] || questionBank.general[depth];
};

const generateChoices = async (text, question) => {
    const context = analyzeContext();
    const aiPrompt = `Question: "${question}". Generate 3 short responses (5 words max each) they might choose. Return strictly as JSON array: ["Option 1", "Option 2", "Option 3"]`;
    
    try {
        const aiChoices = await generateWithAI(aiPrompt);
        
        // IMPORTANT: The AI might return Markdown like ```json ... ``` or just text.
        // We need to clean it to parse the JSON array.
        if (aiChoices) {
            // Simple cleanup to extract the array part
            const jsonMatch = aiChoices.match(/\[.*\]/s);
            if (jsonMatch) {
                 const parsed = JSON.parse(jsonMatch[0]);
                 if (Array.isArray(parsed) && parsed.length >= 3) {
                     return parsed.slice(0, 3).map(t => ({ text: t }));
                 }
            }
        }
    } catch(e) {
        console.warn("AI Choice Parsing Error:", e);
    }
    
    const topicChoices = choiceBank[context.dominantTopic];
    const choices = topicChoices?.[question] || ["Yeah, that's it", "It's complicated", "I don't know"];
    return choices.map(t => ({ text: t }));
};

// ============================================
// UI FUNCTIONS
// ============================================
const updateAura = (delta) => {
    state.auraScore = Math.max(0, Math.min(100, state.auraScore + delta));
    const scoreEl = document.getElementById('auraScore');
    const meterEl = document.getElementById('auraMeter');
    if(scoreEl) scoreEl.textContent = Math.round(state.auraScore);
    if(meterEl) meterEl.style.width = state.auraScore + '%';
};

const addMessage = (text, isUser) => {
    const chat = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`;
    msg.innerHTML = `<div class="max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium ${isUser ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-none shadow-lg' : 'bg-white text-gray-800 rounded-bl-none border border-purple-200 shadow-md'}">${text}</div>`;
    chat.appendChild(msg);
    if(chat) chat.scrollTop = chat.scrollHeight;
};

const showOptions = (options) => {
    const container = document.getElementById('optionsContainer');
    if(!container) return;
    container.innerHTML = '';
    
    options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full px-4 py-3 text-sm text-left bg-white border-2 border-purple-200 rounded-2xl hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all text-gray-700 font-medium hover:shadow-md animate-fade-scale';
        btn.style.animationDelay = `${idx * 50}ms`;
        btn.textContent = opt.text;
        btn.onclick = () => handleMessage(opt.text);
        container.appendChild(btn);
    });
    
    // Text input
    const inputDiv = document.createElement('div');
    inputDiv.className = 'flex gap-2 mt-4 pt-3 border-t border-purple-200/50 animate-slide-up';
    inputDiv.innerHTML = `
        <input type="text" id="freeInput" placeholder="Or share more..." class="flex-1 px-4 py-3 text-sm border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gradient-to-br from-white to-purple-50/50 font-medium" />
        <button onclick="handleMessage(document.getElementById('freeInput').value)" class="px-5 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm rounded-xl hover:shadow-lg font-bold">Send</button>
    `;
    container.appendChild(inputDiv);
    
    const freeInput = document.getElementById('freeInput');
    if(freeInput) {
        freeInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleMessage(freeInput.value);
        });
    }
};

const showInput = (type) => {
    const container = document.getElementById('optionsContainer');
    const placeholder = type === 'name' ? 'Your name...' : 'Your number...';
    const inputId = type === 'name' ? 'nameInput' : 'phoneInput';
    
    container.innerHTML = `
        <div class="flex gap-2 animate-fade-scale ${type === 'phone' ? 'space-y-2' : ''}">
            <input type="text" id="${inputId}" placeholder="${placeholder}" class="flex-1 px-4 py-3 text-sm border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-medium" />
            <button onclick="submit${type.charAt(0).toUpperCase() + type.slice(1)}()" class="px-5 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm rounded-xl hover:shadow-lg font-bold">Send</button>
        </div>
        ${type === 'phone' ? '<button onclick="skipPhone()" class="w-full text-xs text-gray-500 hover:text-gray-700 font-semibold hover:bg-gray-100 rounded-lg py-2">Maybe later</button>' : ''}
    `;
    setTimeout(() => {
        const el = document.getElementById(inputId);
        if(el) el.focus();
    }, 100);
};

// ============================================
// MESSAGE HANDLER (Core Logic)
// ============================================
const handleMessage = async (text) => {
    if (!text?.trim()) return;
    
    addMessage(text, true);
    state.interactionCount++;
    state.conversationHistory.push({ role: 'user', content: text });
    updateAura(2);
    
    await saveConversation(text, '', 'choice');
    const container = document.getElementById('optionsContainer');
    if(container) container.innerHTML = '';
    
    await new Promise(r => setTimeout(r, 800));
    
    const { topics } = extractData(text);
    const { score } = analyzeSentiment(text);
    const context = analyzeContext();
    const topic = topics[0] || context.dominantTopic;
    const userState = score < 40 ? 'struggling' : score > 65 ? 'positive' : 'neutral';
    
    // Response
    const response = await generateResponse(text, topic, userState);
    addMessage(response, false);
    state.conversationHistory.push({ role: 'aura', content: response });
    updateAura(1);
    await saveConversation(text, response, 'response');
    state.emotionalArc.push(score);
    
    // Name check
    if (state.interactionCount === 3 && !state.askedForName) {
        state.askedForName = true;
        setTimeout(() => {
            addMessage("What's your name? I'd love to know. 💜", false);
            setTimeout(() => showInput('name'), 500);
        }, 900);
        return;
    }
    
    // Phone check
    if (state.interactionCount === 6 && !state.askedForPhone) {
        state.askedForPhone = true;
        setTimeout(() => {
            addMessage("You're so brave. Can I send weekly insights? (optional)", false);
            setTimeout(() => showInput('phone'), 500);
        }, 900);
        return;
    }
    
    // Question + Choices
    setTimeout(async () => {
        const question = await generateQuestion(text);
        addMessage(question, false);
        setTimeout(async () => {
            const choices = await generateChoices(text, question);
            showOptions(choices);
        }, 600);
    }, 800);
};

// ============================================
// GLOBAL HANDLERS
// ============================================
window.submitName = async () => {
    const name = document.getElementById('nameInput')?.value?.trim();
    if (!name) return;
    
    state.userName = name;
    addMessage(name, true);
    state.interactionCount++;
    await saveConversation(name, '', 'name');
    await updateUserInfo({ name });
    
    const container = document.getElementById('optionsContainer');
    if(container) container.innerHTML = '';

    setTimeout(() => {
        addMessage(`${name}. Beautiful. 💜`, false);
        updateAura(2);
        setTimeout(() => handleMessage('continue'), 500);
    }, 500);
};

window.submitPhone = async () => {
    const phone = document.getElementById('phoneInput')?.value?.trim();
    if (!phone) return;
    
    state.userPhone = phone;
    addMessage(phone, true);
    state.interactionCount++;
    await saveConversation(phone, '', 'phone');
    await updateUserInfo({ phone });
    
    const container = document.getElementById('optionsContainer');
    if(container) container.innerHTML = '';
    
    setTimeout(() => {
        addMessage("Perfect. Weekly insights coming. 💜", false);
        updateAura(3);
        setTimeout(() => handleMessage('continue'), 500);
    }, 500);
};

window.skipPhone = async () => {
    state.interactionCount++;
    await saveConversation('Skipped phone', '', 'skip_phone');
    const container = document.getElementById('optionsContainer');
    if(container) container.innerHTML = '';
    
    setTimeout(() => {
        addMessage("No worries. I'm here. 💜", false);
        updateAura(1);
        setTimeout(() => handleMessage('continue'), 500);
    }, 500);
};

// ============================================
// MOOD SELECTION
// ============================================
const handleMood = async (mood) => {
    state.currentMood = mood;
    state.interactionCount = 0;
    
    const moodScores = { great: 75, okay: 60, stressed: 35, overwhelmed: 20 };
    state.auraScore = moodScores[mood];
    updateAura(0);
    
    const chat = document.getElementById('chatMessages');
    const container = document.getElementById('optionsContainer');
    if(chat) chat.innerHTML = '';
    if(container) container.innerHTML = '';
    
    await saveConversation(`Selected mood: ${mood}`, '', 'mood');
    
    const openings = {
        great: "Your energy is magnetic. 💜 What's sparking it?",
        okay: "A calm moment. What's floating in?",
        stressed: "I feel the weight. What's pressing on you?",
        overwhelmed: "You're carrying too much. What's the heaviest? 💜"
    };
    
    addMessage(openings[mood], false);
    updateAura(1);
    
    setTimeout(async () => {
        const question = await generateQuestion(mood);
        addMessage(question, false);
        setTimeout(async () => {
            const choices = await generateChoices(mood, question);
            showOptions(choices);
        }, 600);
    }, 600);
};

// ============================================
// INIT
// ============================================
const init = async () => {
    await initUser();
    
    const container = document.getElementById('optionsContainer');
    const moods = [
        { emoji: '😊', label: 'Great', value: 'great' },
        { emoji: '😌', label: 'Okay', value: 'okay' },
        { emoji: '😰', label: 'Stressed', value: 'stressed' },
        { emoji: '😓', label: 'Overwhelmed', value: 'overwhelmed' }
    ];
    
    if(container) {
        moods.forEach((mood, idx) => {
            const btn = document.createElement('button');
            btn.className = 'w-full px-4 py-4 text-sm bg-white border-2 border-purple-200 rounded-2xl hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all text-gray-700 font-bold hover:shadow-md animate-fade-scale';
            btn.style.animationDelay = `${idx * 80}ms`;
            btn.textContent = `${mood.emoji} ${mood.label}`;
            btn.onclick = () => handleMood(mood.value);
            container.appendChild(btn);
        });
    }
};

init();