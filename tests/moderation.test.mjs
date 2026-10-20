import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {accountRole,loadAccountVerifications,setAccountVerification} from '../account-roles.mjs';
import {createModeration} from '../community-moderation.mjs';
import {createInteractions} from '../social-interactions.mjs';
import {createSocial} from '../social.mjs';
import {applyRequestedAccountAdjustment,requestedCoinBonus} from '../account-adjustments.mjs';

const db=await openDatabase(fs.mkdtempSync(path.join(os.tmpdir(),'xp-moderation-'))),fail=(status,message)=>{throw Object.assign(new Error(message),{status});},json=(res,result,status=200)=>Object.assign(res,{result,status}),events=[];
const context={db,json,fail,checkRate(){},everyone:(...args)=>events.push(args),body:async req=>req.payload,userFields:u=>({id:u.id,name:u.name,...accountRole(u.id)}),progression:{socialAction:async()=>{}},stickers:new Map(),characters:[],details:{},serialize:fn=>fn()};
const moderation=createModeration(context),interactions=createInteractions({...context,reactionEmojis:new Set(['❤️'])}),social=createSocial({...context,interactions});
after(()=>db.close());
async function user(id=randomUUID(),name='Cuenta QA'){await db.run('INSERT INTO users(id,name,name_key,email,avatar,bio,created) VALUES(?,?,?,?,?,?,?)',id,name,id,id+'@example.invalid','Dani','',Date.now());return {id,name};}
async function request(user,url,method='GET',payload={}){const res={};try{const req={method,payload},uri=new URL(url,'https://test.invalid');if(!await moderation.handle(req,res,uri,user)&&!await interactions.handle(req,res,uri,user)&&!await social.handle(req,res,uri,user))return {status:404};return {status:res.status,...res.result};}catch(e){if(!e.status)throw e;return {status:e.status,error:e.message};}}

test('solo las dos cuentas exactas tienen staff; las cuatro solicitadas tienen verificación',()=>{
 for(const id of ['4cc31ade-086c-48b2-b77e-27240358e425','92354719-8816-4e25-9199-0dc9a99f7da1'])assert.deepEqual(accountRole(id),{staff:true,verified:true});
 for(const id of ['623c6648-b88a-4eec-be92-09c6d9487442','d1548b50-e9b2-4a1d-b298-58b864a0d284'])assert.deepEqual(accountRole(id),{staff:false,verified:true});
 assert.deepEqual(accountRole('Bonju Belluci'),{staff:false,verified:false});assert.deepEqual(accountRole(randomUUID()),{staff:false,verified:false});
});

test('staff retira y restaura posts y comentarios ajenos sin borrar contenido, reacciones ni saldos',async()=>{
 const staff=await user('92354719-8816-4e25-9199-0dc9a99f7da1'),owner=await user(),ordinary=await user(undefined,'D I O S');
 const post=(await request(owner,'/api/posts','POST',{text:'Una publicación de prueba.'})).post,comment=(await request(ordinary,'/api/posts/'+post.id+'/comments','POST',{text:'Comentario de otra persona.'})).comment;
 await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,77,500,340)',owner.id);const before=await db.one('SELECT * FROM user_progression WHERE user_id=?',owner.id);
 assert.equal((await request(null,'/api/posts/'+post.id,'DELETE')).status,401);assert.equal((await request(ordinary,'/api/posts/'+post.id,'DELETE',{staff:true})).status,403);assert.equal((await request(owner,'/api/comments/'+comment.id,'DELETE')).status,403);
 assert.equal((await request(staff,'/api/comments/'+comment.id,'DELETE')).status,200);assert.equal((await request(staff,'/api/comments/'+comment.id,'DELETE')).status,200);assert.equal((await request(owner,'/api/posts/'+post.id+'/comments')).comments.length,0);assert.equal((await request(owner,'/api/posts/'+post.id+'/activity')).commentsCount,0);assert.equal((await request(owner,'/api/comments/'+comment.id)).status,404);assert.equal((await request(owner,'/api/comments/'+comment.id+'/reaction','POST',{emoji:'❤️'})).status,404);
 assert(await db.one('SELECT * FROM post_comments WHERE id=?',comment.id));assert.equal((await request(ordinary,'/api/moderation')).status,403);assert.equal((await request(ordinary,'/api/moderation/comment/'+comment.id+'/restore','POST')).status,403);
 await request(staff,'/api/moderation/comment/'+comment.id+'/restore','POST');assert.equal((await request(owner,'/api/posts/'+post.id+'/comments')).comments.length,1);
 await request(owner,'/api/posts/'+post.id+'/reaction','POST',{emoji:'❤️'});assert.equal((await request(staff,'/api/posts/'+post.id,'DELETE')).status,200);assert(!(await request(null,'/api/posts')).posts.some(p=>p.id===post.id));assert.equal((await request(owner,'/api/posts/'+post.id+'/comments')).status,404);assert.equal((await request(owner,'/api/posts/'+post.id,'PATCH',{archived:false})).status,404);assert(await db.one('SELECT * FROM posts WHERE id=?',post.id));
 assert.equal((await request(staff,'/api/moderation')).removals[0].id,post.id);await request(staff,'/api/moderation/post/'+post.id+'/restore','POST');assert((await request(null,'/api/posts')).posts.some(p=>p.id===post.id));assert.equal((await request(owner,'/api/posts/'+post.id+'/activity')).reactions[0].count,1);assert.deepEqual(await db.one('SELECT * FROM user_progression WHERE user_id=?',owner.id),before);assert(events.some(([kind])=>kind==='moderation'));
});

test('el bono adicional suma 5000 una sola vez, conserva nivel, tickets y el resto de cuentas',async()=>{
 const u=await user(),other=await user(),bonus={...requestedCoinBonus,emailHash:(await import('node:crypto')).createHash('sha256').update(u.id+'@example.invalid').digest('hex')};
 for(const account of [u,other])await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,377,10267,43300)',account.id);
 assert.equal(await applyRequestedAccountAdjustment(db,bonus),true);assert.equal(await applyRequestedAccountAdjustment(db,bonus),false);const changed=await db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',u.id);assert.deepEqual({...changed},{tickets:377,coins:15267,xp:43300});assert.equal((await db.one('SELECT coins FROM user_progression WHERE user_id=?',other.id)).coins,10267);
});

test('verificaciones del Staff persisten sin conceder permisos de moderación',async()=>{
 const staff={id:'92354719-8816-4e25-9199-0dc9a99f7da1'},target=await user();
 for(const id of ['af5cf74b-2f10-41a6-953d-8a4b5649e076','3994216a-dd05-4fcd-8986-c6d043e66e86','aa958fd5-8d40-463e-b7c9-c74877fe0db4'])assert.deepEqual(accountRole(id),{verified:true,staff:false});
 const url='/api/moderation/profiles/'+target.id+'/verification';
 assert.equal((await request(target,url,'PUT',{verified:true,staff:true})).status,403);
 assert.equal((await request(staff,url,'PUT',{verified:'true'})).status,400);
 assert.equal((await request(staff,url,'PUT',{verified:true})).profile.verified,true);
 setAccountVerification(target.id,false);await loadAccountVerifications(db);assert.deepEqual(accountRole(target.id),{verified:true,staff:false});
 assert.equal((await request(staff,url,'PUT',{verified:false})).profile.verified,false);
 setAccountVerification(target.id,true);await loadAccountVerifications(db);assert.deepEqual(accountRole(target.id),{verified:false,staff:false});
 assert.equal((await db.one('SELECT COUNT(*) AS n FROM moderation_actions WHERE subject=?',target.id)).n,2);
});

test('entregas suman saldo una sola vez, registran autor y conservan XP e inventario',async()=>{
 const staff={id:'92354719-8816-4e25-9199-0dc9a99f7da1'},target=await user(),other=await user();
 await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,79,555,1900)',target.id);
 await db.run('INSERT INTO economy_inventory(user_id,item_id,acquired) VALUES(?,?,?)',target.id,'character:meow',Date.now());
 const alerts=[],grants=createModeration({...context,notify:(...args)=>alerts.push(args),progression:{wallet:async id=>db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',id)}});
 async function grant(actor,payload,id=target.id){const res={};try{await grants.handle({method:'POST',payload},res,new URL('https://test.invalid/api/moderation/profiles/'+id+'/grant'),actor);return {status:res.status,...res.result};}catch(e){if(!e.status)throw e;return {status:e.status};}}
 const payload={coins:500,tickets:9,reason:'Premio de actividad',requestId:randomUUID()};
 assert.equal((await grant(null,payload)).status,401);assert.equal((await grant(other,{...payload,staff:true})).status,403);
 for(const invalid of [{coins:-1},{tickets:0.5},{coins:1000001},{tickets:100001},{reason:''},{requestId:'fake'}])assert.equal((await grant(staff,{...payload,...invalid})).status,400);
 assert.equal((await grant(staff,payload)).alreadyApplied,false);
 await db.run('UPDATE users SET name=? WHERE id=?','Nombre actualizado',target.id);
 assert.equal((await grant(staff,payload)).alreadyApplied,true);
 assert.equal((await grant(staff,{...payload,coins:501})).status,409);assert.equal((await grant(staff,payload,other.id)).status,409);
 assert.deepEqual({...await db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?',target.id)},{tickets:88,coins:1055,xp:1900});
 assert.equal((await db.one('SELECT COUNT(*) AS n FROM economy_inventory WHERE user_id=?',target.id)).n,1);
 assert.equal((await db.one('SELECT COUNT(*) AS n FROM economy_rewards WHERE event_key=?','staff-grant:'+payload.requestId)).n,1);
 assert.equal((await db.one('SELECT moderator FROM moderation_actions WHERE id=?',payload.requestId)).moderator,staff.id);assert.equal(alerts.length,1);
 assert.equal((await request(other,'/api/moderation/profiles')).status,403);
 const detail=(await request(staff,'/api/moderation/profiles/'+target.id)).profile;
 assert.equal(detail.coins,1055);assert(!('email' in detail));assert(!('password' in detail));
});

test('revisión de publicaciones y comentarios incluye retirados solo para Staff',async()=>{
 const staff={id:'92354719-8816-4e25-9199-0dc9a99f7da1'},owner=await user();
 const post=(await request(owner,'/api/posts','POST',{text:'Publicación revisable QA'})).post;
 const comment=(await request(owner,'/api/posts/'+post.id+'/comments','POST',{text:'Comentario revisable QA'})).comment;
 await request(staff,'/api/comments/'+comment.id,'DELETE');await request(staff,'/api/posts/'+post.id,'DELETE');
 const listed=await request(staff,'/api/moderation/posts?status=removed&query=revisable');assert(listed.posts.some(p=>p.id===post.id&&p.removed));
 const comments=await request(staff,'/api/moderation/posts/'+post.id+'/comments');assert(comments.comments.some(c=>c.id===comment.id&&c.removed));
 assert.equal((await request(owner,'/api/moderation/posts/'+post.id+'/comments')).status,403);
 assert.equal((await request(null,'/api/moderation/posts/'+post.id+'/image')).status,401);
 assert.equal((await request(staff,'/api/moderation/posts?status=bad')).status,400);
 const history=await request(staff,'/api/moderation/history');assert(history.actions.some(a=>a.subject===comment.id&&a.action==='remove-comment'));
});
