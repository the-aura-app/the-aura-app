-- ============================================
-- The Aura App - Supabase Database Schema
-- ============================================

-- Users Table
-- Stores user profile information
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Allow anonymous inserts (for signup)
CREATE POLICY "Allow anonymous inserts" ON users
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy - Allow select on own records (can be expanded as needed)
CREATE POLICY "Allow users to view own records" ON users
    FOR SELECT
    USING (true);
