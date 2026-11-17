import test from 'node:test';
import assert from 'node:assert/strict';
import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import Point from 'ol/geom/Point.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {huntAreaStyles,areaLabelAnchor,huntAreaLengthLabel,markerObstacles,distanceLabelObstacle,distanceLabelAnchor} from '../src/hunt/areaStyles.ts';

proj4.defs('EPSG:3301','+proj=lcc +lat_0=57.51755393055556 +lon_0=24 +lat_1=59.33333333333334 +lat_2=58 +x_0=500000 +y_0=6375000 +ellps=GRS80 +units=m +no_defs');
register(proj4);
const labels=feature=>huntAreaStyles(feature).filter(style=>style.getText()).map(style=>style.getText().getText());
const area=ring=>new Feature(new Polygon([ring]).transform('EPSG:3301','EPSG:3857'));
const a=[540000,6500000],b=[540300,6500000],c=[540300,6500400];

test('hunt area labels measure every boundary segment including the closing edge in ground metres',()=>{
 const feature=area([a,b,c,a]);
 assert.deepEqual(labels(feature),[huntAreaLengthLabel(300),huntAreaLengthLabel(400),huntAreaLengthLabel(500)]);
 assert.ok(huntAreaStyles(feature)[0].getStroke());
});
test('live drawing updates lengths and skips repeated cursor vertices',()=>{
 const feature=area([a,b,b,a]);
 assert.deepEqual(labels(feature),[huntAreaLengthLabel(300)]);
 feature.setGeometry(area([a,b,c,a]).getGeometry());
 assert.deepEqual(labels(feature),[huntAreaLengthLabel(300),huntAreaLengthLabel(400),huntAreaLengthLabel(500)]);
 assert.deepEqual(labels(area([a,[541500,6500000],a])),[huntAreaLengthLabel(1500)]);
 assert.deepEqual(labels(new Feature(new Polygon([]))),[]);
 assert.deepEqual(labels(new Feature(new Point([0,0]))),[]);
 assert.ok(huntAreaStyles(new Feature(new Point([0,0])))[0].getImage(),'drawing cursor remains visible');
});


test('area length labels round to whole metres',()=>{
 assert.equal(huntAreaLengthLabel(570.4),'570 m');
 assert.equal(huntAreaLengthLabel(626.7),'627 m');
});
test('labels move inside either polygon winding and keep a screen-sized gap',()=>{
 const ring=[[0,0],[400,0],[400,400],[0,400],[0,0]];
 for(const coordinates of [ring,[...ring].reverse()]){
  const polygon=new Polygon([coordinates]);
  for(let i=1;i<coordinates.length;i++){
   const point=areaLabelAnchor(polygon,coordinates[i-1],coordinates[i],2);
   assert.ok(polygon.intersectsCoordinate(point));
   assert.ok(point[0]>=56&&point[0]<=344&&point[1]>=56&&point[1]<=344);
  }
 }
 const narrow=new Polygon([[[0,0],[100,0],[100,2],[0,2],[0,0]]]);
 assert.ok(narrow.intersectsCoordinate(areaLabelAnchor(narrow,[0,0],[100,0],1)));
});

// Külje pikkuse silt ei tohi jääda kohamärgi, nimesildi ega vahemaa sildi alla.
const overlaps=(point,obstacle,resolution,halfWidth=32,halfHeight=13)=>{
 const right=(point[0]-obstacle.coordinate[0])/resolution,up=(point[1]-obstacle.coordinate[1])/resolution-(obstacle.shiftUp||0);
 return right<obstacle.right+halfWidth&&-right<obstacle.left+halfWidth&&up<obstacle.up+halfHeight&&-up<obstacle.down+halfHeight;
};
test('side length label slides along the edge away from a position marker and its name',()=>{
 const square=new Polygon([[[0,0],[2000,0],[2000,2000],[0,2000],[0,0]]]),resolution=4;
 // Kütt seisab täpselt lääneserva keskel, kus silt vaikimisi oleks.
 const marker=markerObstacles([0,1000],'MINA · Andrus A.');
 assert.equal(marker.length,2,'circle and name label are separate boxes');
 const plain=areaLabelAnchor(square,[0,0],[0,2000],resolution);
 assert.ok(marker.some(box=>overlaps(plain,box,resolution)),'the default middle position is covered by the marker');
 const moved=areaLabelAnchor(square,[0,0],[0,2000],resolution,{obstacles:marker,text:'2000 m'});
 assert.ok(square.intersectsCoordinate(moved),'label stays inside the area');
 for(const box of marker)assert.ok(!overlaps(moved,box,resolution),'label is clear of the marker and name');
 assert.ok(moved[0]<=54*resolution+1,'label stays next to its own edge');
 // Takistuseta küljed jäävad täpselt endisesse kohta.
 assert.deepEqual(areaLabelAnchor(square,[0,0],[2000,0],resolution,{obstacles:marker,text:'2000 m'}),areaLabelAnchor(square,[0,0],[2000,0],resolution));
});
test('several hunters and a distance label on one edge: the label finds the free gap',()=>{
 const square=new Polygon([[[0,0],[2000,0],[2000,2000],[0,2000],[0,0]]]),resolution=4;
 const obstacles=[...markerObstacles([0,1000],'Asko S.'),...markerObstacles([0,1250],'Aadu K.'),distanceLabelObstacle([0,1125]),...markerObstacles([0,760],'Elmar V.')];
 const moved=areaLabelAnchor(square,[0,0],[0,2000],resolution,{obstacles,text:'2000 m'});
 for(const obstacle of obstacles)assert.ok(!overlaps(moved,obstacle,resolution));
 assert.ok(square.intersectsCoordinate(moved));
});
test('rotated map: obstacles are judged in screen space',()=>{
 const square=new Polygon([[[0,0],[2000,0],[2000,2000],[0,2000],[0,0]]]),resolution=4,rotation=Math.PI/2;
 const boxes=markerObstacles([0,1000],'Asko S.');
 const moved=areaLabelAnchor(square,[0,0],[0,2000],resolution,{obstacles:boxes,rotation,text:'2000 m'});
 for(const marker of boxes){
  const dx=moved[0]-marker.coordinate[0],dy=moved[1]-marker.coordinate[1];
  const right=(dx*Math.cos(rotation)+dy*Math.sin(rotation))/resolution,up=(dy*Math.cos(rotation)-dx*Math.sin(rotation))/resolution-(marker.shiftUp||0);
  assert.ok(!(right<marker.right+32&&-right<marker.left+32&&up<marker.up+13&&-up<marker.down+13));
 }
 assert.ok(square.intersectsCoordinate(moved));
});
test('when nothing is free the least covered position inside the area is used',()=>{
 const small=new Polygon([[[0,0],[200,0],[200,200],[0,200],[0,0]]]),resolution=4;
 const crowded=[...markerObstacles([0,100],'Asko S.'),...markerObstacles([0,40],'Aadu K.'),...markerObstacles([0,160],'Elmar V.')];
 const point=areaLabelAnchor(small,[0,0],[0,200],resolution,{obstacles:crowded,text:'200 m'});
 assert.ok(small.intersectsCoordinate(point));assert.ok(point.every(Number.isFinite));
 const labels=huntAreaStyles(new Feature(small),resolution,{obstacles:crowded}).filter(style=>style.getText());
 assert.equal(labels.length,4,'every side keeps its label');
});

test('hunter distance label sits beside its line, on the drive-area side, clear of both markers',()=>{
 const resolution=4,text='222,8 m';
 // Püstine joon lääneserval, aju ala on idas: silt peab olema joonest paremal.
 const vertical=distanceLabelAnchor([0,0],[0,220],resolution,0,[1000,110],text);
 assert.equal(vertical[1],110);assert.ok(vertical[0]/resolution>=40,'whole label box is to the east of the line');
 assert.ok(distanceLabelAnchor([0,0],[0,220],resolution,0,[-1000,110],text)[0]<0,'follows the area to the other side');
 // Rõhtne joon põhjaserval, ala lõunas: silt on joone all ja kitsama nihkega, sest kast on lai, mitte kõrge.
 const horizontal=distanceLabelAnchor([0,2000],[400,2000],resolution,0,[200,1000],text);
 assert.equal(horizontal[0],200);const below=(2000-horizontal[1])/resolution;assert.ok(below>=20&&below<=30,String(below));
 // Kui joon on ekraanil vähemalt umbes 120 px pikk, ei jää otstes olevad märgid (raadius 18 px) sildi alla.
 // Lühema joone korral kattub silt märgi servaga paratamatult; siis aitab sisse suumimine.
 const long=distanceLabelAnchor([0,2000],[600,2000],resolution,0,[300,1000],text);
 for(const end of [[0,2000],[600,2000]])assert.ok(Math.abs(long[0]-end[0])/resolution-41>18,'label box ends before the marker circle begins');
 assert.deepEqual(distanceLabelAnchor([5,5],[5,5],resolution),[5,5]);
});

test('short line between two close hunters: the distance label avoids both markers and their names',()=>{
 const resolution=4,text='222,8 m',a=[0,0],b=[0,400];
 // Kaks kütti 100 px vahega samal püstjoonel; alumise nimesilt asub märgi kohal, täpselt joone keskkoha lähedal.
 const markers=[...markerObstacles(a,'MINA · Andrus A.'),...markerObstacles(b,'Asko S.')];
 const plain=distanceLabelAnchor(a,b,resolution,0,[1000,200],text);
 assert.ok(markers.some(marker=>overlaps(plain,marker,resolution,40.5)),'the plain midpoint position collides');
 const placed=distanceLabelAnchor(a,b,resolution,0,[1000,200],text,markers);
 for(const marker of markers)assert.ok(!overlaps(placed,marker,resolution,40.5),'label is clear of markers and name labels');
 assert.ok(placed[1]>0&&placed[1]<400,'label stays alongside its own line');
 assert.ok(placed[0]>0,'label stays on the drive-area side');
});
