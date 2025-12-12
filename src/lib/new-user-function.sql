
-- Function to be called by the trigger.
-- It inserts a new row into the public.profiles table.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (uid, email, display_name, phone_number, location)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'location'
  );
  return new;
end;
$$ language plpgsql security definer;
