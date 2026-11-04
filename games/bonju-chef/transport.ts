export function deliverPacket(packet:any,{review=false,emit,socket}:any){
 if(review){emit('review-packet',packet);return true;}
 if(!socket||socket.readyState!==1)return false;
 socket.send(JSON.stringify(packet));return true;
}
