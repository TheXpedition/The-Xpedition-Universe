import {itemAtlasArt} from './world-item-art.mjs';
// Recovery values are game points per portion, not dietary or medical advice.
export const FOOD_CATEGORIES=Object.freeze([
 {id:'fruit',name:'Frutas'},{id:'vegetable',name:'Vegetales'},
 {id:'meal',name:'Platos preparados'},{id:'protein',name:'Carnes y proteínas'},
 {id:'dairy',name:'Lácteos'},{id:'snack',name:'Pan y despensa'}
].map(Object.freeze));
const portions=[
 ['river-fish','Pescado de río · crudo','protein',-6,4,1],
 ['apple','Manzana','fruit',1,5,2],
 ['pear','Pera','fruit',1,5,2],
 ['banana','Banana','fruit',2,7,4],
 ['orange','Naranja','fruit',1,5,2],
 ['strawberries','Fresas','fruit',1,4,2],
 ['grapes','Uvas','fruit',1,5,3],
 ['watermelon','Sandía en porción','fruit',1,4,1],
 ['peach','Durazno','fruit',1,5,2],
 ['pineapple','Piña en porción','fruit',2,6,3],
 ['kiwi','Kiwi','fruit',1,3,1],
 ['carrot','Zanahoria','vegetable',1,4,1],
 ['broccoli','Brócoli al vapor','vegetable',2,6,1],
 ['tomato','Tomate','vegetable',1,3,1],
 ['corn','Maíz cocido','vegetable',2,8,3],
 ['cucumber','Pepino en rodajas','vegetable',1,3,1],
 ['pepper','Pimentón asado','vegetable',1,4,1],
 ['pumpkin','Calabaza asada','vegetable',2,7,2],
 ['peas','Arvejas cocidas','vegetable',2,7,2],
 ['soup','Sopa de verduras','meal',3,12,3],
 ['chicken-rice','Arroz con pollo','meal',5,18,6],
 ['pasta','Pasta con tomate','meal',4,16,6],
 ['vegetable-stew','Guiso de verduras','meal',4,15,4],
 ['omelette','Tortilla de verduras','meal',4,14,4],
 ['baked-potato','Papa al horno','meal',3,12,4],
 ['lasagna','Lasaña grande','meal',6,20,7],
 ['camp-stew','Estofado del campamento','meal',8,22,8],
 ['grilled-chicken','Pollo a la plancha','protein',5,15,5],
 ['grilled-fish','Pescado a la plancha','protein',5,14,4],
 ['roast-beef','Carne asada','protein',5,16,5],
 ['boiled-egg','Huevo cocido','protein',2,7,2],
 ['baked-turkey','Pavo al horno','protein',4,14,4],
 ['lentils','Lentejas cocidas','protein',3,12,4],
 ['yogurt','Yogur natural','dairy',2,6,2],
 ['cheese','Porción de queso','dairy',2,6,3],
 ['milk','Vaso de leche','dairy',2,5,2],
 ['kefir','Kéfir natural','dairy',2,5,2],
 ['nuts','Nueces','snack',2,6,4],
 ['wholegrain-bread','Pan integral','snack',2,8,4],
 ['oat-bar','Barra de avena','snack',2,7,5],
 ['crackers','Galletas integrales','snack',1,5,3],
 ['dry-beans','Frijoles secos','protein',0,0,0],
 ['dry-chickpeas','Garbanzos secos','protein',0,0,0],
 ['dry-rice','Arroz seco','snack',0,0,0],
 ['oats','Avena en hojuelas','snack',1,4,2],
 ['onion','Cebolla','vegetable',1,2,1],
 ['garlic','Ajo','vegetable',1,1,0],
 ['potato','Papa','vegetable',0,0,0],
 ['spinach','Espinaca','vegetable',1,3,1],
 ['raw-corn','Mazorca de maíz','vegetable',0,0,0],
 ['fresh-peas','Arvejas frescas','vegetable',1,3,1],
 ['cooked-beans','Frijoles cocidos','protein',2,9,3],
 ['cooked-chickpeas','Garbanzos cocidos','protein',2,9,3],
 ['cooked-rice','Arroz cocido','snack',1,7,3]
];
// Ingredients remain separate inventory items. The server uses cooksTo for campfire output.
const ingredients={
 'dry-beans':{requiresCooking:true,cooksTo:'cooked-beans'},
 'dry-chickpeas':{requiresCooking:true,cooksTo:'cooked-chickpeas'},
 'dry-rice':{requiresCooking:true,cooksTo:'cooked-rice'},
 oats:{},onion:{},garlic:{},potato:{requiresCooking:true,cooksTo:'baked-potato'},
 spinach:{},'raw-corn':{requiresCooking:true,cooksTo:'corn'},'fresh-peas':{},
 'cooked-beans':{cooked:true},'cooked-chickpeas':{cooked:true},'cooked-rice':{cooked:true}
};
export const FOOD_CATALOG=Object.freeze(portions.map(([id,name,category,health,hunger,energy])=>{
 const ingredient=ingredients[id],requiresCooking=ingredient?.requiresCooking===true;
 return Object.freeze({id,name,category,raw:id==='river-fish',ingredient:Boolean(ingredient),...ingredient,health,hunger,energy,
  description:requiresCooking?name+': ingrediente para cocinar junto a una fogata. No se consume directamente; una unidad produce una porción cocida.':name+(id==='river-fish'?': resta 6 de salud y aporta ':': recupera '+health+' de salud, ')+hunger+' de saciedad y '+energy+' de energía. '+(ingredient?'Ingrediente o porción sencilla para las provisiones del equipo. ':['meal','protein','dairy'].includes(category)?'Sensible a la exposición prolongada al calor.':'Porción ligera de campamento.')+(id==='river-fish'?' Crudo resta 6 de salud: cocínalo en una fogata antes de comer.':''),
  allergens:category==='dairy'?['dairy']:id.includes('fish')?['fish']:[],icon:'food-'+(id==='river-fish'?'grilled-fish':id)});
}));
export const FOOD_BY_ID=Object.freeze(Object.fromEntries(FOOD_CATALOG.map(food=>[food.id,food])));
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function foodIcon(id,className=''){
 const food=FOOD_BY_ID[id];if(!food)return '';if(food.raw)return itemAtlasArt(33,{className:'food-icon '+className,label:'Pescado crudo completo'});
 return `<svg class="food-icon${className?' '+escape(className):''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="/juegos/ui/food-icons.svg#${food.icon}"></use></svg>`;
}
export function foodNutritionText(value){const food=FOOD_BY_ID[typeof value==='string'?value:value?.id];return food?food.requiresCooking?'Requiere cocción · No se consume directamente':`Salud ${food.health>=0?'+':''}${food.health} · Hambre +${food.hunger} · Energía +${food.energy}`:'';}
