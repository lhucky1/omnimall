
-- Creates a trigger that fires after a new user is created in the auth.users table.
-- The trigger executes the public.handle_new_user function.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
