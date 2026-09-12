CREATE TABLE IF NOT EXISTS package_service.packages (
  package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  depth DOUBLE PRECISION NOT NULL,
  max_weight DOUBLE PRECISION NOT NULL,
  available_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP with TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP with TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packages_created_at ON package_service.packages(created_at);
