-- Jarvis Operator — migration 06: allow the proposal_sent stage used by the app.
-- NOTE: run this statement alone (not bundled in a multi-statement transaction).
alter type lead_status add value if not exists 'proposal_sent';
