
-- Add view_count column to products table
ALTER TABLE products
ADD COLUMN view_count BIGINT DEFAULT 0;

-- Create function to increment product view count
CREATE OR REPLACE FUNCTION increment_product_view(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET view_count = view_count + 1
  WHERE id = p_product_id;
END;
$$;

-- Create function to get top sellers by revenue
CREATE OR REPLACE FUNCTION get_top_sellers_by_revenue(limit_count INT)
RETURNS TABLE (
  uid UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.uid,
    p.display_name,
    p.avatar_url,
    SUM(o.final_total) AS total_revenue
  FROM
    profiles p
  JOIN
    products pr ON p.uid = pr.seller_uid
  JOIN
    orders o ON pr.id = o.product_id
  WHERE
    o.status = 'approved'
  GROUP BY
    p.uid, p.display_name, p.avatar_url
  ORDER BY
    total_revenue DESC
  LIMIT
    limit_count;
END;
$$;
