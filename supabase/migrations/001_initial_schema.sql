-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PCOS Profile (1-to-1 with auth.users)
CREATE TABLE profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_concern   text NOT NULL DEFAULT 'general',
  secondary_concerns text[] DEFAULT '{}',
  diagnosed         boolean DEFAULT false,
  age               int,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Meal Logs
CREATE TABLE meal_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  input_method     text NOT NULL,
  meal_description text,
  product_name     text,
  raw_composition  jsonb,
  analysis_result  jsonb NOT NULL,
  pcos_score       int NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Flagged Ingredients (for trend tracking)
CREATE TABLE flagged_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid REFERENCES meal_logs(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient  text NOT NULL,
  risk_type   text,
  severity    text
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own flagged ingredients"
  ON flagged_ingredients FOR ALL USING (auth.uid() = user_id);
