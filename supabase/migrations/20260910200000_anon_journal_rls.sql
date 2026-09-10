-- Make user_id nullable (no longer required for anon usage)
ALTER TABLE public.journal_entries
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- Remove the foreign key constraint that requires a valid auth.users row
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_user_id_fkey;

-- Drop the old authenticated-only policy
DROP POLICY IF EXISTS "users_manage_own_journal_entries" ON public.journal_entries;

-- Allow anonymous (public) users to insert rows
CREATE POLICY "anon_insert_journal_entries"
ON public.journal_entries
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous (public) users to select all rows
CREATE POLICY "anon_select_journal_entries"
ON public.journal_entries
FOR SELECT
TO anon
USING (true);

-- Allow anonymous (public) users to update rows
CREATE POLICY "anon_update_journal_entries"
ON public.journal_entries
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
