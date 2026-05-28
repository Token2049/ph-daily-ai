CREATE TABLE public.ph_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ph_id TEXT NOT NULL,
  list_date DATE NOT NULL,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  url TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  votes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  ai_zh_tagline TEXT,
  ai_zh_intro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_date, ph_id)
);

CREATE INDEX idx_ph_products_date_rank ON public.ph_products (list_date DESC, rank ASC);

GRANT SELECT ON public.ph_products TO anon;
GRANT SELECT ON public.ph_products TO authenticated;
GRANT ALL ON public.ph_products TO service_role;

ALTER TABLE public.ph_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read products"
ON public.ph_products
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ph_products_updated_at
BEFORE UPDATE ON public.ph_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();