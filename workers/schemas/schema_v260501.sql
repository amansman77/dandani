-- ADR-PROD-003: Action Taxonomy — add action_type column to action_flows
ALTER TABLE action_flows ADD COLUMN action_type TEXT;
