-- Extra production roles. Must be its own migration: Postgres forbids using a
-- freshly-added enum value in the same transaction that added it, and
-- migrate.js wraps each file in one transaction. 011 (which seeds
-- role_permissions for these) runs after this commits.
--   LAB_MANAGER    -> lab_manager (or the existing 'lab' overview role)
--   LAB_TECHNICIAN -> technician        DESIGNER -> designer
--   QC             -> qc                DENTIST  -> dentist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lab_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dispatch';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'in_house_dentist';
