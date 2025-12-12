-- ============================================
-- The Aura App - Supabase Database Schema
-- ============================================

-- Users Table
-- Stores user profile information
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    anon_id UUID,
    name VARCHAR(255),
    phone VARCHAR(20),
    
    -- Personalization fields
    mood VARCHAR(50),
    relationship_status VARCHAR(50),
    stress_level INT CHECK (stress_level >= 0 AND stress_level <= 10),
    daily_intent TEXT,
    
    -- Engagement metrics
    streak_count INT DEFAULT 0,
    last_visit_date DATE,
    -- Waitlist flag
    waitlist_joined BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Analyses Table
-- Stores each day's aura reading and user input
CREATE TABLE IF NOT EXISTS daily_analyses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Aura score (randomized 1-100)
    aura_score INT CHECK (aura_score >= 1 AND aura_score <= 100),
    insight_title VARCHAR(255),
    insight_description TEXT,
    
    -- User mood snapshot for this day
    mood VARCHAR(50),
    stress_level INT,
    relationship_status VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_anon_id ON users(anon_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analyses_user_id ON daily_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_analyses_created_at ON daily_analyses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Allow anonymous inserts (for signup)
CREATE POLICY "Allow anonymous inserts" ON users
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy - Allow select on own records
CREATE POLICY "Allow users to view own records" ON users
    FOR SELECT
    USING (true);

-- RLS Policy - Allow updates to own records
CREATE POLICY "Allow users to update own records" ON users
    FOR UPDATE
    USING (true);

-- RLS Policy - Allow inserts to daily_analyses
CREATE POLICY "Allow daily analyses inserts" ON daily_analyses
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy - Allow select on daily_analyses
CREATE POLICY "Allow daily analyses select" ON daily_analyses
    FOR SELECT
    USING (true);
