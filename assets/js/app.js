// ============================================
// 1. CONFIGURATION
// ============================================
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM"; 
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/rapid-function`;

// ============================================
// 2. STATE MANAGEMENT
// ============================================
let state = {
    userId: null,
    anonId: localStorage.getItem('aura_anon_id') || crypto.randomUUID(),
    currentMood: null,
    auraScore: 50,
    interactionCount: 0,
    userName: null,
    askedForName: false,
    askedForPhone: false,
    conversationHistory: [] 
};

localStorage.setItem('aura_anon_id', state.anonId);

let db = null;
if (window.supabase) {
    try { 
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { 'x-anon-id': state.anonId } }
        }); 
    } 
    catch (e) { console.warn("Supabase Init Failed", e); }
}

// ============================================
// 3. BACKEND CONNECTION
// ============================================
const callAuraBrain = async (prompt) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ 
                prompt: prompt,
                userId: state.userId,
                mood: state.currentMood || "neutral",
                history: state.conversationHistory
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) return await response.json();
        throw new Error("API Response not OK");
    } catch (err) {
        console.error("Brain Error:", err);
        return null;
    }
};

// ============================================
// 4. LOGIC & RESET
// ============================================

window.resetSession = async () => {
    // 1. Generate NEW Identity
    state.anonId = crypto.randomUUID();
    localStorage.setItem('aura_anon_id', state.anonId);
    
    // 2. Update DB Client
    if (window.supabase) {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { 'x-anon-id': state.anonId } }
        });
    }

    // 3. Reset State
    state.userId = null;
    state.userName = null;
    state.userPhone = null;
    state.currentMood = null;
    state.auraScore = 50;
    state.interactionCount = 0;
    state.conversationHistory = [];
    state.askedForName = false;
    state.askedForPhone = false;

    // 4. Reset UI
    document.getElementById('chatMessages').innerHTML = ''; 
    updateAuraUI(0);
    
    // 5. Restore Welcome Screen & Moods
    renderWelcomeScreen();
    renderMoodButtons();

    // 6. Create new user entry in background
    await initUser();
};

const renderWelcomeScreen = () => {
    const chat = document.getElementById('chatMessages');
    // We check if it's already there to avoid flickering
    if (!document.getElementById('welcomeScreen')) {
        chat.innerHTML = `
            <div id="welcomeScreen" class="h-full flex flex-col justify-center items-center text-center p-6 animate-fade-in mt-10">
                <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span class="text-4xl">💜</span>
                </div>
                <h2 class="text-xl font-semibold text-gray-800 mb-2">How are you feeling?</h2>
                <p class="text-sm text-gray-500 max-w-[200px]">Your conversations are private and safe here.</p>
            </div>
        `;
    }
};

// ============================================
// 5. DATABASE & INIT
// ============================================
const initUser = async () => {
    if (!db) return;
    
    // Check if user exists for this anon_id
    const { data: existing } = await db.from('users').select('id, name').eq('anon_id', state.anonId).single();
    
    if (existing) {
        state.userId = existing.id;
        state.userName = existing.name;
        // If we found a user, try to load history
        if (state.conversationHistory.length === 0) await loadHistory();
    } else {
        // Create new user
        const { data, error } = await db.from('users').insert([{ anon_id: state.anonId }]).select();
        if (!error && data?.[0]) state.userId = data[0].id;
    }
};

const loadHistory = async () => {
    if (!db || !state.userId) return;
    
    const { data, error } = await db
        .from('conversations')
        .select('user_message, aura_response')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !data || data.length === 0) return;

    // We found history, so we remove the Welcome Screen
    const welcome = document.getElementById('welcomeScreen');
    if(welcome) welcome.remove();

    const history = data.reverse();
    
    history.forEach(row => {
        state.conversationHistory.push({ role: 'user', content: row.user_message });
        state.conversationHistory.push({ role: 'assistant', content: row.aura_response });
        
        addMessage(row.user_message, true, false);
        addMessage(row.aura_response, false, false);
    });
    
    state.auraScore = Math.min(100, 50 + (history.length * 2));
    updateAuraUI(0);

    // Overwrite the Mood Buttons with conversation options
    showOptions(["Continue", "New Topic"]);
};

// ============================================
// 6. UI HELPERS
// ============================================
const updateAuraUI = (delta) => {
    state.auraScore = Math.max(0, Math.min(100, state.auraScore + delta));
    const scoreEl = document.getElementById('auraScore');
    const meterEl = document.getElementById('auraMeter');
    if (scoreEl) scoreEl.textContent = Math.round(state.auraScore);
    if (meterEl) meterEl.style.width = `${state.auraScore}%`;
};

const addMessage = (text, isUser, animate = true) => {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();

    const chat = document.getElementById('chatMessages');
    const msgWrapper = document.createElement('div');
    
    msgWrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} w-full ${animate ? 'animate-slide-up' : ''}`;
    
    const bubbleClass = isUser 
        ? 'bg-purple-600 text-white rounded-[1.2rem] rounded-br-none shadow-md' 
        : 'bg-white text-gray-800 border border-gray-100 rounded-[1.2rem] rounded-bl-none shadow-sm';

    const bubble = document.createElement('div');
    bubble.className = `max-w-[85%] px-5 py-3 text-[15px] leading-relaxed font-medium ${bubbleClass}`;
    bubble.textContent = text; 

    msgWrapper.appendChild(bubble);
    chat.appendChild(msgWrapper);
    
    setTimeout(() => {
        msgWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
};

const showOptions = (options) => {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = ''; 

    const bubblesDiv = document.createElement('div');
    bubblesDiv.className = 'grid grid-cols-1 gap-2 mb-2'; 
    
    options.forEach((optStr, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full px-5 py-3.5 text-left bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-sm font-semibold transition-all active:scale-95 animate-slide-up border border-purple-100';
        btn.style.animationDelay = `${idx * 50}ms`;
        btn.textContent = optStr;
        btn.onclick = () => handleUserResponse(optStr);
        bubblesDiv.appendChild(btn);
    });
    container.appendChild(bubblesDiv);

    const inputDiv = document.createElement('div');
    inputDiv.className = 'relative flex items-center animate-slide-up';
    inputDiv.innerHTML = `
        <input type="text" id="freeInput" placeholder="Type here..." autocomplete="off" class="w-full bg-gray-50 text-gray-800 rounded-full py-3.5 pl-5 pr-12 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all shadow-inner" />
        <button id="sendBtn" class="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-md active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
    `;
    container.appendChild(inputDiv);

    const handleSend = () => {
        const input = document.getElementById('freeInput');
        const val = input.value;
        if(val) {
            input.value = ''; 
            handleUserResponse(val);
        }
    };
    
    document.getElementById('sendBtn').onclick = handleSend;
    document.getElementById('freeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
};

const showDataInput = (type) => {
    const container = document.getElementById('optionsContainer');
    const placeholder = type === 'name' ? 'What should I call you?' : 'Phone (for weekly insights)';
    
    container.innerHTML = `
        <div class="flex flex-col gap-3 animate-slide-up">
            <div class="flex gap-2">
                <input type="text" id="dataInput" placeholder="${placeholder}" class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
                <button id="dataBtn" class="bg-purple-600 text-white px-5 rounded-xl font-bold text-sm shadow-md">Save</button>
            </div>
            <button id="skipBtn" class="text-xs text-center text-gray-400 py-2 hover:text-gray-600">Skip for now</button>
        </div>
    `;
    
    setTimeout(() => {
        const el = document.getElementById('dataInput');
        if(el) el.focus();
    }, 100);

    const handleSave = async () => {
        const val = document.getElementById('dataInput').value;
        if (!val) return;
        
        if (type === 'name') state.userName = val;
        else state.userPhone = val;

        if (db && state.userId) {
            await db.from('users').update({ [type]: val }).eq('id', state.userId);
        }
        
        addMessage(val, true); 
        handleUserResponse(`My ${type} is ${val}`, true); 
    };

    document.getElementById('dataBtn').onclick = handleSave;
    document.getElementById('skipBtn').onclick = () => handleUserResponse("Skip", true);
};

// ============================================
// 7. CORE LOGIC
// ============================================
const renderMoodButtons = () => {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    const moods = [
        { emoji: '😊', label: 'Great', value: 'Great' },
        { emoji: '😌', label: 'Okay', value: 'Okay' },
        { emoji: '😰', label: 'Stressed', value: 'Stressed' },
        { emoji: '😓', label: 'Overwhelmed', value: 'Overwhelmed' }
    ];

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3';
    
    moods.forEach((mood, idx) => {
        const btn = document.createElement('button');
        btn.className = 'flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-purple-400 hover:shadow-md transition-all active:scale-95 animate-slide-up';
        btn.style.animationDelay = `${idx * 50}ms`;
        btn.innerHTML = `<span class="text-xl">${mood.emoji}</span> <span class="font-bold text-gray-700 text-sm">${mood.label}</span>`;
        btn.onclick = () => handleMoodSelection(mood.value);
        grid.appendChild(btn);
    });
    container.appendChild(grid);
};

const handleMoodSelection = async (mood) => {
    state.currentMood = mood;
    const scores = { 'Great': 80, 'Okay': 60, 'Stressed': 40, 'Overwhelmed': 20 };
    state.auraScore = scores[mood] || 50;
    updateAuraUI(0);
    
    // Remove Welcome Screen instantly on click
    const welcome = document.getElementById('welcomeScreen');
    if(welcome) welcome.remove();

    await handleUserResponse(`I am feeling ${mood}`);
};

const handleUserResponse = async (text, isSystemEvent = false) => {
    if (!text.trim()) return;

    if (!isSystemEvent) {
        addMessage(text, true);
        state.conversationHistory.push({ role: "user", content: text });
        state.interactionCount++;
    }

    document.getElementById('optionsContainer').innerHTML = `
        <div class="flex justify-center items-center py-6 space-x-2 opacity-50">
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
    `;

    // Progressive Profiling Triggers
    if (state.interactionCount === 3 && !state.askedForName && !state.userName) {
        state.askedForName = true;
        setTimeout(() => {
            addMessage("I feel a connection. What is your name?", false);
            showDataInput('name');
        }, 800);
        return;
    }
    if (state.interactionCount === 6 && !state.askedForPhone && !state.userPhone) {
        state.askedForPhone = true;
        setTimeout(() => {
            addMessage("You are doing great work. Can I get your number for weekly insights?", false);
            showDataInput('phone');
        }, 800);
        return;
    }

    const aiResult = await callAuraBrain(text);

    if (aiResult) {
        addMessage(aiResult.reply, false);
        state.conversationHistory.push({ role: "assistant", content: aiResult.reply });
        updateAuraUI(2);
        
        const safeChoices = aiResult.choices && aiResult.choices.length > 0 ? aiResult.choices : ["Tell me more", "I see", "Continue"];
        showOptions(safeChoices);
    } else {
        addMessage("My connection feels weak. Could you say that again?", false);
        showOptions(["Retry", "Skip"]);
    }
};

// ============================================
// 8. INITIALIZATION
// ============================================
const init = async () => {
    // 1. Immediately render Mood Buttons (Welcome screen is already in HTML)
    // This solves the "First Glance" issue.
    renderMoodButtons();

    // 2. Check DB in background
    await initUser();
    // initUser -> loadHistory() will overwrite the buttons if history is found.
};

init();
