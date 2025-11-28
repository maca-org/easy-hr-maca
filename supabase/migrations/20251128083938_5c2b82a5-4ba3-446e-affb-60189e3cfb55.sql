-- Create trigger on auth.users to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profiles for existing users that don't have one
INSERT INTO public.profiles (id, email, company_name)
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data ->> 'company_name'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;