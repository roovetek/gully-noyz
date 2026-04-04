/*
  # Add Out Outcome Types

  1. Changes
    - Update the check constraint on clips table to allow new out outcome types
    - New outcome types: bowled, caught, lbw, runout, stumped, hitwicket, hitballtwice, obstructing, timedout, handledball
    - Keep existing types: dot, 1, 2, 3, 4, 6, wicket

  2. Security
    - No changes to RLS policies
*/

-- Drop existing constraint
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_outcome_check;

-- Add updated constraint with all outcome types
ALTER TABLE clips 
ADD CONSTRAINT clips_outcome_check 
CHECK (outcome IN (
  'dot', '1', '2', '3', '4', '6', 'wicket',
  'bowled', 'caught', 'lbw', 'runout', 'stumped', 
  'hitwicket', 'hitballtwice', 'obstructing', 'timedout', 'handledball'
));