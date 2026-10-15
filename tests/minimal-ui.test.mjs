import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const docks=readFileSync(new URL('../src/ui/ActionDocks.tsx',import.meta.url),'utf8');
const ui=app+docks;

test('guest navigation exposes working public tools instead of login traps',()=>{
 assert.match(app,/setSearchMode\(member\?'club':'official'\);setPanel\('search'\)/);
 assert.match(app,/canAdd=\{Boolean\(member&&member\.role!=='viewer'\)\}/);
 assert.match(docks,/canAdd\?<button className="add".*:<button onClick=\{onLocate\}/s);
 assert.doesNotMatch(app,/setPanel\(member\?'search':'login'\)/);
});

test('layers and observation filters share one map-content surface',()=>{
 assert.match(app,/Modal title="Kaardi sisu"/);
 assert.match(app,/className="filter-details"/);
 assert.doesNotMatch(app,/panel==='filters'/);
});

test('field mode uses one exclusive surface and a dedicated action dock',()=>{
 assert.match(app,/useState<'position'\|'participants'\|'more'\|null>\(null\)/);
 assert.match(docks,/className="bottomnav hunt-dock"/);
 assert.match(ui,/huntSurface==='position'/);
 assert.match(ui,/huntSurface==='participants'/);
 assert.match(app,/aria-pressed=\{windEnabled\}/);
 assert.match(ui,/huntSurface==='more'/);
 assert.doesNotMatch(ui,/huntGpsPanelOpen|huntWindOpen|offlinePanel/);
});

test('UI shell is offline-safe and avoids the former override pile-up',()=>{
 assert.doesNotMatch(css,/fonts\.googleapis\.com/);
 assert.match(css,/font-family:system-ui/);
 assert.match(css,/--muted:#526b5f/);
 assert.ok((css.match(/!important/g)||[]).length<50);
 assert.ok((app.match(/style=\{\{/g)||[]).length<15);
});
