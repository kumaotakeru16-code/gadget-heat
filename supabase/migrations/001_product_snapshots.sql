-- Gadget Heat: daily product snapshots for trend delta computation.
-- Each row = one product as seen on one calendar day.
-- The unique index prevents duplicate saves within the same day.

CREATE TABLE IF NOT EXISTS gadget_product_snapshots (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text        NOT NULL,          -- 'rakuten' | 'bestbuy'
  product_id     text        NOT NULL,          -- source-native item ID
  product_key    text        NOT NULL,          -- normalized key (brand + model tokens)
  market         text        NOT NULL,          -- 'audio' | 'support' | …
  cat            text,                          -- product category label
  name           text,
  brand          text,
  price          integer,                       -- JPY (or local currency units)
  rating         numeric(3,2),
  review_count   integer,
  score          integer,                       -- computed trend score at capture time
  image_url      text,
  item_url       text,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  captured_date  date GENERATED ALWAYS AS (captured_at::date) STORED
);

-- Prevent saving the same product twice on the same day.
CREATE UNIQUE INDEX IF NOT EXISTS gadget_product_snapshots_daily_uniq
  ON gadget_product_snapshots (source, product_id, captured_date);

-- Fast lookups by product key across dates (for delta queries).
CREATE INDEX IF NOT EXISTS gadget_product_snapshots_key_date
  ON gadget_product_snapshots (product_key, captured_date DESC);

-- Colophon query: all snapshots for a given date.
CREATE INDEX IF NOT EXISTS gadget_product_snapshots_date
  ON gadget_product_snapshots (captured_date DESC);
