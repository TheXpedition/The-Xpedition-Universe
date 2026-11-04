import {randomUUID} from 'node:crypto';
import {createWorldShop} from '../../world-shop-service.mjs';
// Gameplay fixtures start after character purchase. Initial purchase/access
// behavior is tested separately with an explicitly empty inventory.
export async function seedOwnedFixtureCharacters(db,actors){
 const shop=createWorldShop({db});await shop.ready;
 for(const a of actors)if(a.character&&a.owned!==false)await db.run("INSERT INTO world_shop_items(id,owner,kind,ref,state,payload,created,updated) VALUES(?,?,'character',?,'owned',?,1,1) ON CONFLICT DO NOTHING",randomUUID(),a.id,a.character,JSON.stringify({fixture:'purchased-character'}));
}
