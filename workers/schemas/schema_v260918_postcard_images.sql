ALTER TABLE digital_postcards ADD COLUMN image_data BLOB;
ALTER TABLE digital_postcards ADD COLUMN image_mime TEXT;
ALTER TABLE digital_postcards ADD COLUMN download_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_download_token
  ON digital_postcards(download_token)
  WHERE download_token IS NOT NULL;
