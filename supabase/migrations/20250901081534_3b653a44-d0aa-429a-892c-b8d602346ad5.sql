-- Add dark_theme_variant column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN dark_theme_variant TEXT DEFAULT 'default';

-- Add a check constraint to ensure only valid dark theme variants are stored
ALTER TABLE public.user_preferences 
ADD CONSTRAINT check_dark_theme_variant 
CHECK (dark_theme_variant IN ('default', 'warm-dark', 'cool-dark', 'soft-dark', 'ocean-dark'));