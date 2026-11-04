import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FOOD_CATALOG,FOOD_BY_ID,FOOD_CATEGORIES,foodIcon,foodNutritionText} from '../public/juegos/world-foods.mjs';
test('the food catalog includes distinct ingredients and modest ready-to-eat portions across all food groups',()=>{
 assert.equal(FOOD_CATALOG.length,54);assert.equal(new Set(FOOD_CATALOG.map(food=>food.id)).size,FOOD_CATALOG.length);assert(Object.isFrozen(FOOD_CATALOG));
 const categories=new Set(FOOD_CATEGORIES.map(category=>category.id));assert.equal(categories.size,6);
 for(const food of FOOD_CATALOG){assert.equal(FOOD_BY_ID[food.id],food);assert(Object.isFrozen(food));assert(categories.has(food.category));assert(food.name.length>2);assert(Number.isInteger(food.health)&&(food.raw?food.health===-6:food.requiresCooking?food.health===0:food.health>=1&&food.health<=10));assert(Number.isInteger(food.hunger)&&food.hunger>=(food.requiresCooking?0:food.ingredient?1:3)&&food.hunger<=22);assert(Number.isInteger(food.energy)&&food.energy>=0&&food.energy<=8);}
 for(const category of categories)assert(FOOD_CATALOG.some(food=>food.category===category));
 assert.equal(FOOD_CATALOG.filter(food=>food.health>5).length,2);assert(FOOD_BY_ID['camp-stew'].health>FOOD_BY_ID.apple.health);assert(FOOD_BY_ID['chicken-rice'].hunger>FOOD_BY_ID.tomato.hunger);
 for(const id of ['grilled-chicken','grilled-fish','roast-beef','boiled-egg','baked-turkey','lentils'])assert.match(FOOD_BY_ID[id].name,/plancha|asada|cocido|horno|cocidas/);
});
test('each portion has its own local cartoon symbol and safe accessible markup',()=>{
 const svg=fs.readFileSync(new URL('../public/juegos/ui/food-icons.svg',import.meta.url),'utf8');
 assert.equal((svg.match(/<symbol\b/g)||[]).length,53);assert(!/href="https?:|<image\b|<script\b|onload=|foreignObject/.test(svg));
 for(const food of FOOD_CATALOG){assert(svg.includes(`id="${food.icon}"`),food.id+' artwork');assert(food.raw?foodIcon(food.id).includes('survival-item-art'):foodIcon(food.id).includes(`/juegos/ui/food-icons.svg#${food.icon}`));assert.match(foodNutritionText(food),food.requiresCooking?/Requiere cocción/:/Salud [+-]\d+ · Hambre \+\d+ · Energía \+\d+/);}
 assert.equal(foodIcon('missing'), '');assert.equal(foodNutritionText({id:'missing'}),'');assert(!foodIcon('apple','" onload="alert(1)').includes('class="food-icon " onload='));
});
test('dry staples remain ingredients until cooked and every cooking result is a real consumable portion',()=>{
 const routes={'dry-beans':'cooked-beans','dry-chickpeas':'cooked-chickpeas','dry-rice':'cooked-rice',potato:'baked-potato','raw-corn':'corn'};
 for(const [id,output]of Object.entries(routes)){const food=FOOD_BY_ID[id],result=FOOD_BY_ID[output];assert(food.ingredient&&food.requiresCooking,id);assert.equal(food.cooksTo,output);assert.equal(food.health,0);assert.equal(food.hunger,0);assert.match(food.description,/No se consume directamente/);assert(result&&!result.requiresCooking);assert(result.health>=1&&result.health<=3);assert(result.hunger>0);}
 for(const id of ['oats','onion','garlic','spinach','fresh-peas'])assert(FOOD_BY_ID[id].ingredient&&!FOOD_BY_ID[id].requiresCooking,id);
 assert.equal(FOOD_BY_ID['river-fish'].health,-6);assert.equal(FOOD_BY_ID['river-fish'].raw,true);assert.match(foodNutritionText('river-fish'),/Salud -6/);
});
