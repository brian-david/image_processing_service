CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE images(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  parent_image_id uuid REFERENCES images(id),
  original_filename text NOT NULL,
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  size_bytes integer NOT NULL,
  transformations jsonb,
  transform_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX images_user_id_created_at_idx ON images(user_id, created_at DESC);
CREATE UNIQUE INDEX images_parent_hash_idx ON images(parent_image_id, transform_hash);