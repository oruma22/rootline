-- Add plan_id column to journal_entries to link entries to plans
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;
