import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {openDatabase} from '../database.mjs';import {createWorldShop} from '../world-shop-service.mjs';
test('old automatic selections do not become free collectibles and paid and gifted characters survive the correction',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'world-starter-fix-')),db=await openDatabase(dir);try{await db.run("INSERT INTO users(id,name,name_key,email,avatar,created) VALUES('user','Prueba','prueba','prueba@example.invalid','Dani',1)");await db.run("INSERT INTO world_preferences(user_id,character_id,updated) VALUES('user','bruno',1)");const shop=createWorldShop({db});await shop.ready;assert.equal((await shop.snapshot({id:'user'})).inventory.length,0);
  for(const [id,ref,payload]of [['legacy','bruno',{starter:true}],['paid','peggy',{}],['gift','ivy',{}]])await db.run("INSERT INTO world_shop_items(id,owner,kind,ref,state,payload,created,updated) VALUES(?,'user','character',?,'owned',?,1,1)",id,ref,JSON.stringify(payload));
  assert.deepEqual((await shop.snapshot({id:'user'})).inventory.map(i=>i.ref).sort(),['ivy','peggy']);assert.equal((await db.one("SELECT state FROM world_shop_items WHERE id='legacy'")).state,'legacy-free');assert.deepEqual((await shop.snapshot({id:'user'})).inventory.map(i=>i.id).sort(),['gift','paid']);
 }finally{await db.close();await fs.rm(dir,{recursive:true,force:true});}
});
