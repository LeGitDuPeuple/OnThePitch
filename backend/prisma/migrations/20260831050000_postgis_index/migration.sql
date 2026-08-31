CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX idx_lieu_position
  ON lieu USING GIST (
    (ST_MakePoint(longitude::float8, latitude::float8)::geography)
  );
