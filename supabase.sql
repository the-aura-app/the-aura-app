-- Users Table
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    anon_id text UNIQUE NOT NULL,
    name text,
    phone text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Conversations Table (includes everything - mood, name, phone, messages)
CREATE TABLE conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    user_message text,
    aura_response text,
    message_type text DEFAULT 'interaction',
    mood text,
    created_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);