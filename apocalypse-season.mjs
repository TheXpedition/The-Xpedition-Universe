import {createProtocolHistory} from './world-protocol-history.mjs';
import {roomArchiveReader} from './world-server-store.mjs';
import {orderTrackCast} from './public/juegos/protocol-track.mjs';

export async function readApocalypseSeason(db){
 const rooms=await db.all('SELECT id,settings FROM world_servers ORDER BY created,id');
 const room=rooms.find(({settings})=>{
  const options=JSON.parse(settings);
  return !options.archivedAt&&!options.deletingAt;
 });
 const archive=room?await roomArchiveReader(db,room.id):null;
 const history=await createProtocolHistory({db:archive||db}).list();
 const episodes=history.episodes.map(({episode,challenge})=>({episode,challenge}));
 const cast=orderTrackCast(history).map(({characterId,name})=>({
  characterId,name,grayscale:characterId==='gabrielsab',
  results:history.episodes.map(episode=>episode.cast.find(person=>person.characterId===characterId)?.result??null),
  final:history.final?.winner===characterId?'Winner':history.final?.runners.includes(characterId)?'Runner-up':null
 }));
 return {episodes,cast,hasFinal:!!history.final};
}
