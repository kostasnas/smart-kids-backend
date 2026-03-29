-- ============================================================
-- SMART KIDS APP - SUPABASE DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. KIDS PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS kids_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(10) DEFAULT '👤',
  gender VARCHAR(10) CHECK (gender IN ('boy', 'girl', 'αγόρι', 'κορίτσι')),
  birthdate DATE,
  shoe_size VARCHAR(10),
  clothing_size VARCHAR(10),
  last_shoe_update DATE,
  last_clothes_update DATE,
  notify_birthday BOOLEAN DEFAULT true,
  notify_size BOOLEAN DEFAULT true,
  notify_school BOOLEAN DEFAULT true,
  notify_seasonal BOOLEAN DEFAULT true,
  favorite_character VARCHAR(100),
  favorite_sport VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE TRIGGER kids_profiles_updated_at
  BEFORE UPDATE ON kids_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. WISHLIST ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kid_id UUID REFERENCES kids_profiles(id) ON DELETE SET NULL,
  product_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  thumbnail TEXT,
  store VARCHAR(255),
  current_price DECIMAL(10,2) DEFAULT 0,
  original_price DECIMAL(10,2) DEFAULT 0,
  product_link TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. PRICE HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES wishlist_items(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE kids_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Helper function for user authentication
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID 
LANGUAGE sql 
STABLE 
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), '00000000-0000-0000-0000-000000000000')::UUID;
$$;

-- ============================================================
-- RLS POLICIES FOR KIDS_PROFILES
-- ============================================================

-- Users can view their own kids profiles
CREATE POLICY "Users can view own kids profiles" ON kids_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own kids profiles
CREATE POLICY "Users can insert own kids profiles" ON kids_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own kids profiles
CREATE POLICY "Users can update own kids profiles" ON kids_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own kids profiles
CREATE POLICY "Users can delete own kids profiles" ON kids_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES FOR WISHLIST_ITEMS
-- ============================================================

-- Users can view their own wishlist items
CREATE POLICY "Users can view own wishlist items" ON wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own wishlist items
CREATE POLICY "Users can insert own wishlist items" ON wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own wishlist items
CREATE POLICY "Users can update own wishlist items" ON wishlist_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own wishlist items
CREATE POLICY "Users can delete own wishlist items" ON wishlist_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES FOR PRICE_HISTORY
-- ============================================================

-- Users can view price history for their own wishlist items
CREATE POLICY "Users can view own price history" ON price_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wishlist_items 
      WHERE wishlist_items.id = price_history.item_id 
      AND wishlist_items.user_id = auth.uid()
    )
  );

-- Users can insert price history for their own wishlist items
CREATE POLICY "Users can insert own price history" ON price_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wishlist_items 
      WHERE wishlist_items.id = price_history.item_id 
      AND wishlist_items.user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Kids profiles indexes
CREATE INDEX IF NOT EXISTS idx_kids_profiles_user_id ON kids_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_kids_profiles_created_at ON kids_profiles(created_at);

-- Wishlist items indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_kid_id ON wishlist_items(kid_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_added_at ON wishlist_items(added_at DESC);

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_checked_at ON price_history(checked_at DESC);

-- ============================================================
-- HELPERS & FUNCTIONS
-- ============================================================

-- Function to update updated_at column (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get kids with age calculation
CREATE OR REPLACE FUNCTION get_kids_with_age(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  avatar VARCHAR,
  gender VARCHAR,
  birthdate DATE,
  shoe_size VARCHAR,
  clothing_size VARCHAR,
  last_shoe_update DATE,
  last_clothes_update DATE,
  notify_birthday BOOLEAN,
  notify_size BOOLEAN,
  notify_school BOOLEAN,
  notify_seasonal BOOLEAN,
  favorite_character VARCHAR,
  favorite_sport VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  age INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kp.*,
    CASE 
      WHEN kp.birthdate IS NOT NULL THEN 
        DATE_PART('year', AGE(NOW(), kp.birthdate))::INTEGER
      ELSE 5
    END as age
  FROM kids_profiles kp
  WHERE kp.user_id = p_user_id
  ORDER BY kp.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================

-- Uncomment to add sample data for testing
/*
-- Sample kid profile (will use the first authenticated user)
INSERT INTO kids_profiles (user_id, name, avatar, gender, birthdate, shoe_size, clothing_size)
SELECT 
  auth.uid(),
  'Γιώργος',
  '👦',
  'boy',
  '2019-05-15',
  '28',
  '116'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid());

-- Sample wishlist item
INSERT INTO wishlist_items (user_id, title, store, current_price, product_link)
SELECT 
  auth.uid(),
  'Παιδικά Παπούτσια Nike',
  'Nike Store',
  45.99,
  'https://www.nike.com/kids-shoes'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid());
*/

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

-- Schema created successfully!
-- Tables: kids_profiles, wishlist_items, price_history
-- RLS enabled with user-specific policies
-- Indexes created for performance
-- Helper functions available
