-- Migration: idea_tree_nodes, idea_tree_edges, and archived column for plans
-- Timestamp: 20260910143000

-- 1. Add archived column to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- 2. Create idea_tree_nodes table
CREATE TABLE IF NOT EXISTS public.idea_tree_nodes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'thought',
  date_label text NOT NULL DEFAULT '',
  x double precision NOT NULL DEFAULT 80,
  y double precision NOT NULL DEFAULT 40,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create idea_tree_edges table
CREATE TABLE IF NOT EXISTS public.idea_tree_edges (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_node text NOT NULL,
  to_node text NOT NULL,
  relation text NOT NULL DEFAULT 'related',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_idea_tree_nodes_user_id ON public.idea_tree_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_tree_edges_user_id ON public.idea_tree_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_tree_edges_from_node ON public.idea_tree_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_idea_tree_edges_to_node ON public.idea_tree_edges(to_node);
CREATE INDEX IF NOT EXISTS idx_plans_archived ON public.plans(archived);

-- 5. Enable RLS
ALTER TABLE public.idea_tree_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_tree_edges ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for idea_tree_nodes
DROP POLICY IF EXISTS "users_manage_own_idea_tree_nodes" ON public.idea_tree_nodes;
CREATE POLICY "users_manage_own_idea_tree_nodes"
ON public.idea_tree_nodes
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. RLS Policies for idea_tree_edges
DROP POLICY IF EXISTS "users_manage_own_idea_tree_edges" ON public.idea_tree_edges;
CREATE POLICY "users_manage_own_idea_tree_edges"
ON public.idea_tree_edges
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
