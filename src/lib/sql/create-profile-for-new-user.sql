-- src/lib/sql/create-profile-for-new-user.sql

-- This function will be triggered after a new user is created in the auth.users table.
-- It creates a corresponding entry in the public.profiles table.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
$$;

-- This trigger will execute the function after each new user insertion.
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();
