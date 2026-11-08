// A readiness message is NOT delivered until the authoritative ceremony
// server acknowledges the SAME ceremony and request. Browser WebSocket.send()
// has no delivery guarantee, and the remote bridge may reconnect independently.
export class ProtocolReadyDelivery {
 constructor({send,retryMs=1400,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,newId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}={}){
  this.send=send;this.retryMs=retryMs;this.setTimer=setTimer;this.clearTimer=clearTimer;this.newId=newId;
  this.ceremonyId=null;this.requestId=null;this.timer=null;this.acknowledged=false;
 }
 begin(ceremonyId){
  if(!ceremonyId)return;
  if(this.ceremonyId===ceremonyId)return;
  this.cancel();
  this.ceremonyId=ceremonyId;
  this.requestId=this.newId();
  this.attempt();
 }
 attempt(){
  if(!this.ceremonyId||this.acknowledged)return;
  try{this.send?.({type:'protocol-ready',ceremonyId:this.ceremonyId,requestId:this.requestId});}
  catch{/* The WebSocket may have just closed; retry on reconnection. */}
  if(!this.timer)this.timer=this.setTimer(()=>{this.timer=null;this.attempt();},this.retryMs);
 }
 reconnect(){
  if(!this.ceremonyId)return;
  // A dedicated motor restart can recover the same ceremony from the DB but
  // clear each participant's assetsReady flag. Reconfirm on every new World
  // socket, even if the old socket already received a successful ACK.
  if(this.acknowledged){this.acknowledged=false;this.requestId=this.newId();}
  if(this.timer){this.clearTimer(this.timer);this.timer=null;}
  this.attempt();
 }
 acknowledge(message){
  if(message?.type!=='protocol-ready-ack'||message.accepted!==true||
     message.ceremonyId!==this.ceremonyId||message.requestId!==this.requestId)return false;
  this.acknowledged=true;
  if(this.timer){this.clearTimer(this.timer);this.timer=null;}
  return true;
 }
 cancel(){
  if(this.timer){this.clearTimer(this.timer);this.timer=null;}
  this.ceremonyId=null;this.requestId=null;this.acknowledged=false;
 }
}
