import {randomBytes,createHash} from 'node:crypto';

export function createPasswordRecovery({db,body,json,fail,checkRate,serialize,passwordHash,verifyPassword,closeSessions=()=>{},apiKey,fetch:request=fetch,now=Date.now}){
 const recent=new Map();
 const reply={ok:true,message:'Si hay una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'};
 const emulator=process.env.NODE_ENV==='test'?process.env.FIREBASE_AUTH_EMULATOR_HOST:'';
 if(emulator&&!/^(localhost|127\.0\.0\.1):\d+$/.test(emulator))throw Error('El emulador de autenticación debe ser local.');
 const base=emulator?'http://'+emulator+'/identitytoolkit.googleapis.com/v1/accounts:':'https://identitytoolkit.googleapis.com/v1/accounts:';
 async function firebase(action,values){
  let response,result;
  try{response=await request(base+action+'?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json','X-Firebase-Locale':'es'},body:JSON.stringify(values),signal:AbortSignal.timeout(15000)});result=await response.json();}
  catch{throw Object.assign(Error('No se pudo conectar con el servicio de recuperación. Vuelve a intentarlo.'),{status:503});}
  if(!response.ok)throw Object.assign(Error(result.error?.message||'RECOVERY_UNAVAILABLE'),{firebaseCode:String(result.error?.message||'').split(' : ')[0]});
  return result;
 }
 async function handle(req,res,url){
  if(url.pathname!=='/api/auth/forgot-password'||req.method!=='POST')return false;
  checkRate(req,'password-recovery',6,15*60000);
  const input=await body(req),email=String(input.email||'').trim().toLowerCase();
  if(email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email))fail(400,'Escribe un correo electrónico válido.');
  const key=createHash('sha256').update(email).digest('hex'),stamp=now();
  for(const [key,until]of recent)if(until<=stamp)recent.delete(key);
  if(recent.has(key)){json(res,reply);return true;}
  recent.set(key,stamp+60000);
  const account=await db.one('SELECT * FROM users WHERE email=?',email);
  const pending=account?await db.one('SELECT requested FROM password_recovery_requests WHERE user_id=?',account.id):null;
  if(pending&&stamp-Number(pending.requested)<60000){json(res,reply);return true;}
  try{
   if(account&&!account.firebase_id){
    try{await firebase('signUp',{email,password:randomBytes(48).toString('base64url'),returnSecureToken:false});}
    catch(error){if(error.firebaseCode!=='EMAIL_EXISTS')throw error;}
   }
   await firebase('sendOobCode',{requestType:'PASSWORD_RESET',email});
   if(account)await serialize(()=>db.run('INSERT INTO password_recovery_requests(user_id,requested) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET requested=excluded.requested',account.id,stamp));
  }catch(error){
   if(error.firebaseCode!=='EMAIL_NOT_FOUND'){
    recent.delete(key);
    console.warn('Password recovery provider unavailable:',error.firebaseCode||'CONNECTION_FAILED');
    fail(503,'No se pudo enviar el correo de recuperación. Vuelve a intentarlo en unos minutos.');
   }
  }
  json(res,reply);return true;
 }
 async function signInAfterReset(account,password){
  const pending=await db.one('SELECT requested FROM password_recovery_requests WHERE user_id=?',account.id);
  if(!pending||now()-Number(pending.requested)>86400000)return null;
  let remote;
  try{
   const signed=await firebase('signInWithPassword',{email:account.email,password,returnSecureToken:true});
   const result=await firebase('lookup',{idToken:signed.idToken});remote=result.users?.[0];
  }catch{return null;}
  // A matching email alone is not proof of ownership. The reset link verifies it in Firebase.
  if(!remote?.localId||remote.emailVerified!==true||String(remote.email||'').toLowerCase()!==account.email.toLowerCase()||account.firebase_id&&account.firebase_id!==remote.localId)return null;
  if(password.length<8)fail(400,'Elige una contraseña de al menos 8 caracteres desde el enlace de recuperación.');
  const hash=await passwordHash(password);
  const updated=await db.transaction(async()=>{
   const current=await db.one('SELECT * FROM users WHERE id=?',account.id);
   if(current.password!==account.password){return await verifyPassword(password,current.password)?current:null;}
   const consumed=await db.run('DELETE FROM password_recovery_requests WHERE user_id=? AND requested=?',account.id,pending.requested);
   if(!consumed.changes)return null;
   await db.run('UPDATE users SET password=? WHERE id=?',hash,account.id);
   await db.run('DELETE FROM sessions WHERE user_id=?',account.id);
   return db.one('SELECT * FROM users WHERE id=?',account.id);
  });
  if(updated)closeSessions(account.id);
  return updated;
 }
 return {handle,signInAfterReset};
}
