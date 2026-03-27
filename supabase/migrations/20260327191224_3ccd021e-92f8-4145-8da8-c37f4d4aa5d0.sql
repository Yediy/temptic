INSERT INTO public.client_invites (agency_id, client_id, client_signer_id, email, token, status, expires_at)
VALUES (
  '3ab23147-eba4-42eb-a849-15274e72000b',
  '3f509d70-ca4f-403b-a6a3-d1f499371ba1',
  '6ef339ce-a8fd-46ed-b782-1219f3d80967',
  'testclient123@mailinator.com',
  'fcbb645a1de8c4c4033bfb0c32d70366675f7e09ad29b62acc542dc50c3ee5d8',
  'pending',
  now() + interval '7 days'
);