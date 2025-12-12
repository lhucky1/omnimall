-- Add view_count to products table
alter table public.products
add column if not exists view_count integer default 0;

-- Function to increment product view count
create or replace function public.increment_product_view (p_product_id uuid)
returns void
language plpgsql
as $$
begin
  update public.products
  set view_count = view_count + 1
  where id = p_product_id;
end;
$$;

-- Function to get top sellers by revenue
create or replace function public.get_top_sellers_by_revenue (limit_count int)
returns table (
  uid uuid,
  display_name text,
  avatar_url text,
  total_revenue numeric
)
language sql
as $$
  select
    p.uid,
    p.display_name,
    p.avatar_url,
    sum(o.final_total) as total_revenue
  from
    public.orders as o
    join public.products as pr on o.product_id = pr.id
    join public.profiles as p on pr.seller_uid = p.uid
  where
    o.status = 'approved'
  group by
    p.uid, p.display_name, p.avatar_url
  order by
    total_revenue desc
  limit limit_count;
$$;
