-- Jarvis Operator — migration 04: fix RLS infinite recursion.
-- The workspace_members FOR ALL owner policy queried workspaces, whose
-- member policy queried workspace_members → recursion on every SELECT.
-- Fix: owner management applies to writes only; SELECT stays self-scoped.

drop policy if exists "ws_owner_manage" on workspace_members;

create policy "ws_owner_manage_insert" on workspace_members for insert to authenticated
  with check (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()));

create policy "ws_owner_manage_update" on workspace_members for update to authenticated
  using (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()));

create policy "ws_owner_manage_delete" on workspace_members for delete to authenticated
  using (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()));
