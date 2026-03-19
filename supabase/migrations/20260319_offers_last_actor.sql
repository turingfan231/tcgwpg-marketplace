alter table public.offers
add column if not exists last_actor_id uuid references public.profiles(id) on delete set null;

update public.offers
set last_actor_id = case
  when status = 'pending' then buyer_id
  when status = 'countered' then seller_id
  when status in ('accepted', 'declined') then seller_id
  else buyer_id
end
where last_actor_id is null;
