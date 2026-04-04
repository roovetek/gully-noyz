/*
  # Upgrade Secret Hashing to SHA-256

  This migration upgrades the secret hashing mechanism from base64 encoding (btoa)
  to proper SHA-256 cryptographic hashing for enhanced security.

  ## Important Security Note

  The previous implementation used btoa (base64 encoding) which is NOT a hashing
  algorithm and provides no security. This migration removes support for the old
  encoding and requires all private matches to use proper SHA-256 hashing.

  ## Changes

  1. Migration Strategy
    - Drops the old `verify_match_secret` function that used pgcrypto's crypt()
    - Future secrets will be hashed using SHA-256 via the Web Crypto API
    - The secret_hash column remains TEXT to store hex-encoded SHA-256 hashes

  2. Important Notes
    - Existing matches with base64-encoded secrets will need to be re-created
    - New secrets will be 64-character hex strings (SHA-256 output)
    - Secret verification happens client-side using Web Crypto API
    - Database only stores and compares the SHA-256 hash

  ## Security Improvements

  - Replaces weak base64 encoding with SHA-256 cryptographic hashing
  - Uses Web Crypto API for secure, standards-based hashing
  - Provides proper one-way hashing with collision resistance
  - Follows modern security best practices
*/

-- Drop the old verify_match_secret function that used crypt
DROP FUNCTION IF EXISTS verify_match_secret(text, text);

-- Add a comment to the secret_hash column explaining the new format
COMMENT ON COLUMN matches.secret_hash IS
  'SHA-256 hash of the match secret, stored as 64-character hex string. Generated using Web Crypto API.';