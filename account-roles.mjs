// Roles belong to these existing account IDs, never to an editable display name.
const verifiedAccounts=new Set(['4cc31ade-086c-48b2-b77e-27240358e425','623c6648-b88a-4eec-be92-09c6d9487442','92354719-8816-4e25-9199-0dc9a99f7da1','d1548b50-e9b2-4a1d-b298-58b864a0d284']);
const staffAccounts=new Set(['4cc31ade-086c-48b2-b77e-27240358e425','92354719-8816-4e25-9199-0dc9a99f7da1']);
export const isStaff=id=>staffAccounts.has(id);
export const accountRole=id=>({verified:verifiedAccounts.has(id),staff:isStaff(id)});
