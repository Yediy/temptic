-- Assign client_user role
INSERT INTO public.user_roles (user_id, role)
VALUES ('cc9770af-59d3-4b6c-a3d8-6ce25c190cb2', 'client_user')
ON CONFLICT DO NOTHING;

-- Create client_signer record linking user to Acme Construction
INSERT INTO public.client_signers (client_id, user_id, first_name, last_name, email, title, is_active)
VALUES (
  '254118e2-4768-4453-933a-0186b779936c',
  'cc9770af-59d3-4b6c-a3d8-6ce25c190cb2',
  'Test',
  'Client',
  'bragreat1@gmail.com',
  'Foreman',
  true
)
ON CONFLICT DO NOTHING;