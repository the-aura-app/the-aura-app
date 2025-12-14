// ============================================
// 1. CONFIGURATION
// ============================================
const SUPABASE_URL = "https://onmsmasusiadszoqicot.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubXNtYXN1c2lhZHN6b3FpY290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTUwMjgsImV4cCI6MjA4MTAzMTAyOH0.jWcvdRHg_n3LTNL9Kd19AKff-DHJT8XfZ7l4_IIdagM"; // The one starting with eyJ...

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/rapid-function`;

let db = null;
if (window.supabase) {
    try { db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } 
    catch (e) { console.warn("Supabase Init Failed"); }
}

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

// ============================================
// 3. BACKEND CONNECTION
// ============================================
const callAuraBrain = async (prompt) => {
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
        });
        if (response.ok) return await response.json();
        return null;
    } catch (err) {
        console.error("Network Error:", err);
        return null;
    }
};

// ============================================
// 4. LOGIC & RESET
// ============================================

// A. Reset Function (New Start)
window.resetSession = () => {
    // 1. Reset RAM State (Keep userId/anonId, but clear context)
    state.currentMood = null;
    state.auraScore = 50;
    state.interactionCount = 0;
    state.conversationHistory = []; // Wipe memory
    state.askedForName = false;
    state.askedForPhone = false;

    // 2. Clear UI
    document.getElementById('chatMessages').innerHTML = ''; // Clear chat
    updateAuraUI(0); // Reset score to 50

    // 3. Show Welcome & Moods
    renderWelcomeScreen();
    renderMoodButtons();
};

const renderWelcomeScreen = () => {
    const chat = document.getElementById('chatMessages');
    chat.innerHTML = `
        <div id="welcomeScreen" class="h-full flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <span class="text-4xl">💜</span>
            </div>
            <h2 class="text-xl font-semibold text-gray-800 mb-2">How are you feeling?</h2>
            <p class="text-sm text-gray-500 max-w-[200px]">Your conversations are private and safe here.</p>
        </div>
    `;
};

// ============================================
// 5. DATABASE & INIT
// ============================================
const initUser = async () => {
    if (!db) return;
    const { data: existing } = await db.from('users').select('id, name').eq('anon_id', state.anonId).single();
    
    if (existing) {
        state.userId = existing.id;
        state.userName = existing.name;
        // Only load history if we are NOT in a "Reset" state (on Page Load only)
        // Since this function runs on page load, we default to loading history.
        await loadHistory();
    } else {
        const { data, error } = await db.from('users').insert([{ anon_id: state.anonId }]).select();
        if (!error && data?.[0]) state.userId = data[0].id;
    }
};

const loadHistory = async () => {
    if (!db || !state.userId) return;
    const { data, error } = await db.from('conversations').select('user_message, aura_response').eq('user_id', state.userId).order('created_at', { ascending: false }).limit(8);

    if (error || !data || data.length === 0) return;

    // If history exists, remove welcome screen immediately
    const welcome = document.getElementById('welcomeScreen');
    if(welcome) welcome.remove();

    const history = data.reverse();
    history.forEach(row => {
        state.conversationHistory.push({ role: 'user', content: row.user_message });
        state.conversationHistory.push({ role: 'assistant', content: row.aura_response });
    });

    history.slice(-2).forEach(row => {
        addMessage(row.user_message, true);
        addMessage(row.aura_response, false);
    });
    
    // If we have history, user has already picked a mood previously.
    // We can infer they want to continue, OR show moods if they want to switch.
    // For now, let's keep the mood buttons visible so they can continue or switch.
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

const addMessage = (text, isUser) => {
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove(); // Ensure welcome screen is gone

    const chat = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    
    // Improved bubble styling
    msgDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up w-full`;
    const bubbleClass = isUser 
        ? 'bg-purple-600 text-white rounded-[1.2rem] rounded-br-none shadow-md' 
        : 'bg-white text-gray-800 border border-gray-100 rounded-[1.2rem] rounded-bl-none shadow-sm';

    msgDiv.innerHTML = `
        <div class="max-w-[85%] px-5 py-3 text-[15px] leading-relaxed font-medium ${bubbleClass}">
            ${text}
        </div>
    `;
    
    chat.appendChild(msgDiv);
    // Auto-scroll to bottom
    setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
    }, 50);
};

const showOptions = (options) => {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = ''; 

    // Container for bubbles (Grid layout for better space usage)
    const bubblesDiv = document.createElement('div');
    bubblesDiv.className = 'grid grid-cols-1 gap-2'; 
    
    options.forEach((optStr, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-full px-5 py-3.5 text-left bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-sm font-semibold transition-all active:scale-95 animate-slide-up border border-purple-100';
        btn.style.animationDelay = `${idx * 50}ms`;
        btn.textContent = optStr;
        btn.onclick = () => handleUserResponse(optStr);
        bubblesDiv.appendChild(btn);
    });
    container.appendChild(bubblesDiv);

    // Free Text Input
    const inputDiv = document.createElement('div');
    inputDiv.className = 'relative flex items-center mt-2 animate-slide-up';
    inputDiv.innerHTML = `
        <input type="text" id="freeInput" placeholder="Type..." class="w-full bg-gray-50 text-gray-800 rounded-full py-3.5 pl-5 pr-12 border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all shadow-inner" />
        <button id="sendBtn" class="absolute right-1.5 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
    `;
    container.appendChild(inputDiv);

    const handleSend = () => {
        const val = document.getElementById('freeInput').value;
        if(val) handleUserResponse(val);
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
    setTimeout(() => document.getElementById('dataInput').focus(), 100);

    const handleSave = async () => {
        const val = document.getElementById('dataInput').value;
        if (!val) return;
        
        if (type === 'name') state.userName = val;
        else state.userPhone = val;

        if (db && state.userId) await db.from('users').update({ [type]: val }).eq('id', state.userId);
        
        addMessage(val, true); // Show user input
        handleUserResponse(`My ${type} is ${val}`, true); // Inform AI silently
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
    
    // Remove welcome screen
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

    // Loading State
    document.getElementById('optionsContainer').innerHTML = `
        <div class="flex justify-center items-center py-4 space-x-2 opacity-50">
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
    `;

    // Trigger Checks (Name/Phone)
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
            addMessage("Can you share me phone no., I will notify you", false);
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
        addMessage("Connection weak. Try again?", false);
        showOptions(["Retry"]);
    }
};

// Init
const init = async () => {
    await initUser();
    // Use the function to render initial buttons
    // If history was loaded, initUser() handles the UI state. 
    // If NO history, we show moods:
    if (state.conversationHistory.length === 0) {
        renderMoodButtons();
    }
};

init();