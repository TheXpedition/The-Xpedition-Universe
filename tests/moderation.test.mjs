import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../database.mjs';
import {accountRole} from '../account-roles.mjs';
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
