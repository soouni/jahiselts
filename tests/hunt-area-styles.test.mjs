import test from 'node:test';
import assert from 'node:assert/strict';
import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import Point from 'ol/geom/Point.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {huntAreaStyles} from '../src/hunt/areaStyles.ts';
import {lengthLabel} from '../src/measurement.ts';

proj4.defs('EPSG:3301','+proj=lcc +lat_0=57.51755393055556 +lon_0=24 +lat_1=59.33333333333334 +lat_2=58 +x_0=500000 +y_0=6375000 +ellps=GRS80 +units=m +no_defs');
register(proj4);
const labels=feature=>huntAreaStyles(feature).filter(style=>style.getText()).map(style=>style.getText().getText());
const area=ring=>new Feature(new Polygon([ring]).transform('EPSG:3301','EPSG:3857'));
const a=[540000,6500000],b=[540300,6500000],c=[540300,6500400];

test('hunt area labels measure every boundary segment including the closing edge in ground metres',()=>{
 const feature=area([a,b,c,a]);
 assert.deepEqual(labels(feature),[lengthLabel(300),lengthLabel(400),lengthLabel(500)]);
 assert.ok(huntAreaStyles(feature)[0].getStroke());
});
test('live drawing updates lengths and skips repeated cursor vertices',()=>{
 const feature=area([a,b,b,a]);
 assert.deepEqual(labels(feature),[lengthLabel(300)]);
 feature.setGeometry(area([a,b,c,a]).getGeometry());
 assert.deepEqual(labels(feature),[lengthLabel(300),lengthLabel(400),lengthLabel(500)]);
 assert.deepEqual(labels(area([a,[541500,6500000],a])),[lengthLabel(1500)]);
 assert.deepEqual(labels(new Feature(new Polygon([]))),[]);
 assert.deepEqual(labels(new Feature(new Point([0,0]))),[]);
 assert.ok(huntAreaStyles(new Feature(new Point([0,0])))[0].getImage(),'drawing cursor remains visible');
});
