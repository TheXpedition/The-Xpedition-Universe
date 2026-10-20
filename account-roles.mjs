// Roles belong to these existing account IDs, never to an editable display name.
const verifiedAccounts=new Set(['4cc31ade-086c-48b2-b77e-27240358e425','623c6648-b88a-4eec-be92-09c6d9487442','92354719-8816-4e25-9199-0dc9a99f7da1','d1548b50-e9b2-4a1d-b298-58b864a0d284','af5cf74b-2f10-41a6-953d-8a4b5649e076','3994216a-dd05-4fcd-8986-c6d043e66e86','aa958fd5-8d40-463e-b7c9-c74877fe0db4']);
const staffAccounts=new Set(['4cc31ade-086c-48b2-b77e-27240358e425','92354719-8816-4e25-9199-0dc9a99f7da1']);
export const isStaff=id=>staffAccounts.has(id);
const verificationOverrides=new Map();
export const accountRole=id=>({verified:verificationOverrides.has(id)?verificationOverrides.get(id):verifiedAccounts.has(id),staff:isStaff(id)});
export async function loadAccountVerifications(db){verificationOverrides.clear();for(const row of await db.all('SELECT user_id,verified FROM profile_verifications'))verificationOverrides.set(row.user_id,!!Number(row.verified));}
export const setAccountVerification=(id,verified)=>verificationOverrides.set(id,verified);
