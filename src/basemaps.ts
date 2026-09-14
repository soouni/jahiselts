import WMTS,{optionsFromCapabilities} from 'ol/source/WMTS.js';
import {createFromCapabilitiesMatrixSet} from 'ol/tilegrid/WMTS.js';
import {transformExtent} from 'ol/proj.js';

export function createBasemapSource(cap:any,name:string){
 const options=optionsFromCapabilities(cap,{layer:name,matrixSet:'GMC',requestEncoding:'KVP'});
 const matrix=cap.Contents?.TileMatrixSet?.find((m:any)=>m.Identifier==='GMC');
 const layer=cap.Contents?.Layer?.find((l:any)=>l.Identifier===name);
 if(!options||!matrix||!layer?.WGS84BoundingBox)throw Error('Aluskaardi kirjeldus on puudulik.');
 // The source's GMC TileMatrixSetLimits exclude valid Estonian tiles (at z11,
 // Pärnjõe is col1165,row609; advertised limits start at col1411,row1122).
 // Keep the official matrix origins, scales and IDs, but use the official
 // geographic coverage instead of those inconsistent row/column limits.
 options.tileGrid=createFromCapabilitiesMatrixSet(matrix,transformExtent(layer.WGS84BoundingBox,'EPSG:4326','EPSG:3857'));
 options.urls=['https://tiles.maaamet.ee/tm/wmts'];
 const source=new WMTS({...options,crossOrigin:'anonymous'});
 source.updateDimensions({ASUTUS:'PARNJOE_JAHISELTS',KESKKOND:'LIVE',IS:'JAHIKAART'});
 return source;
}
