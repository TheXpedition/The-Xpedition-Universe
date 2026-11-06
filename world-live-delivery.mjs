const snapshots=new Set(['move','protocol-state','grip-state','chef-state']);
export function deliverWorldPacket(ws,data,encode=JSON.stringify){
 if(ws.readyState!==1)return false;
 // A slow client needs the next current snapshot, rather than a forced reconnect
 // after queuing obsolete frames. Reliable actions and chat remain ordered.
 if(ws.bufferedAmount>65536&&snapshots.has(data.type))return false;
 if(ws.bufferedAmount>2097152){console.warn('World socket backpressure',Math.ceil(ws.bufferedAmount/1024)+' KiB','packet='+data.type);ws.close(4008,'La conexión está atrasada. Vuelve a entrar.');return false;}
 ws.send(encode(data));return true;
}
