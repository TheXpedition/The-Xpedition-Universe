// Cosmetic companions share the actor's ground coordinates and never add collision.
const PET_SCALES = {giraffe:.5,broom:.46,zebra:.4,lion:.42,jester:.58};

export class WorldPets {
 constructor() {
  this.catalog = new Map();
  this.images = new Map();
  this.followers = new Map();
  void fetch('/juegos/shop/pets.json').then(r => r.json()).then(rows => {
   for (const pet of rows) this.catalog.set(pet.id, pet);
  }).catch(() => {});
 }

 draw(c, p, height, time, {groundScale=.62,zone='world'}={}) {
  if (!p.petId || p.state === 'dead') return;
  const meta = this.catalog.get(p.petId);
  if (!meta) return;
  let im = this.images.get(meta.id);
  if (!im) {
   im = new Image();
   im.src = meta.image;
   this.images.set(meta.id, im);
  }
  if (!im.complete || !im.naturalWidth) return;

  const petScale = meta.scale ?? PET_SCALES[meta.id] ?? .235;
  const h = height * petScale;
  const w = h * im.naturalWidth / im.naturalHeight;
  const tx = p.x - Math.max(height * (petScale > .3 ? .43 : .31), w / 2);
  const ty = p.y;
  const id = p.userId || p.id;
  const key = zone + ':' + p.petId;
  let f = this.followers.get(id);
  if (!f || f.key !== key || Math.hypot(f.x - tx, (f.y - ty) * groundScale) > height * 2) {
   f = {x:tx,y:ty,at:time,key};
   this.followers.set(id, f);
  }
  const dt = Math.max(0, Math.min(.1, time - f.at));
  f.at = time;
  const blend = 1 - Math.exp(-dt * 6);
  f.x = Math.min(f.x + (tx - f.x) * blend, p.x - w / 2);
  f.y += (ty - f.y) * blend;

  const bob = meta.flying
   ? height * (meta.flightHeight ?? (meta.id === 'bat' ? .88 : .65)) + Math.sin(time * 5) * height * .035
   : p.moving ? Math.abs(Math.sin(time * 10)) * height * .014 : Math.sin(time * 2) * height * .003;
  const facing = p.facing === -1 ? -1 : 1;
  c.save();
  c.fillStyle = '#0d090644';
  c.beginPath();
  c.ellipse(f.x, f.y * groundScale, w * .32, h * .09, 0, 0, Math.PI * 2);
  c.fill();
  c.translate(f.x, f.y * groundScale - h - bob);
  c.scale(facing * (meta.artFacing ?? 1), 1);
  c.drawImage(im, -w / 2, 0, w, h);
  c.restore();
 }
}
