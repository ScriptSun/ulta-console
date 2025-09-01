-- Add light_theme_variant column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN light_theme_variant TEXT DEFAULT 'default';

-- Add a check constraint to ensure only valid light theme variants are stored
ALTER TABLE public.user_preferences 
ADD CONSTRAINT check_light_theme_variant 
CHECK (light_theme_variant IN ('default', 'soft-white', 'cool-gray', 'warm-cream', 'minimal-light'));