-- Fix: add missing INSERT policy on family_groups.
-- The initial migration omitted this, causing signup to fail with a
-- generic "Something went wrong" error when a new user tried to create
-- their family group.
--
-- Run this in the Supabase SQL Editor if you already ran 001_initial.sql.

create policy "Authenticated users can create a group" on public.family_groups
  for insert with check (auth.role() = 'authenticated');
