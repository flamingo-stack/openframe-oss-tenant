-- Connect to authentik database
\c "integrated-tools-database-authentik"

-- Create schemas
CREATE SCHEMA IF NOT EXISTS authentik;
CREATE SCHEMA IF NOT EXISTS public;

-- Set search path
SET search_path TO authentik, public;