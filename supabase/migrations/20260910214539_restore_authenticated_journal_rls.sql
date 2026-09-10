-- Undo the anon-access shortcut from 20260910200000_anon_journal_rls.sql.
-- That migration dropped the authenticated-only policy and only added
-- policies for the `anon` role, leaving zero RLS coverage for real
-- logged-in (authenticated) users -- so every insert/update from a
-- logged-in session was silently rejected by Postgres.

-- Drop the anon-only policies
DROP POLICY IF EXISTS "anon_insert_journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "anon_select_journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "anon_update_journal_entries" ON public.journal_entries;

-- Restore the authenticated-only policy so logged-in users can manage
-- their own entries again
DROP POLICY IF EXISTS "users_manage_own_journal_entries" ON public.journal_entries;
CREATE POLICY "users_manage_own_journal_entries"
ON public.journal_entries
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Remove entries created during the broken anon phase — they have no
-- user_id, aren't visible to anyone under the restored RLS policy anyway,
-- and would block the NOT NULL constraint below.
DELETE FROM public.idea_tree_nodes WHERE id IN (
  SELECT id FROM public.journal_entries WHERE user_id IS NULL
);
DELETE FROM public.journal_entries WHERE user_id IS NULL;

-- Re-require user_id and restore the link to auth.users, now that entries
-- are always created by an authenticated user again
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.journal_entries
  ALTER COLUMN user_id SET NOT NULL;
