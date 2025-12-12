-- Simplified users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anon_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    current_mood TEXT,
    streak_count INTEGER DEFAULT 1,
    last_visit_date TEXT,
    waitlist_joined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- New conversations table (replaces daily_analyses and expressions)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    aura_response TEXT NOT NULL,
    mood TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_anon_id ON users(anon_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);