import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';

/** Eesti ruutkoordinaadid (L-EST97); kaart, ala-kontroll ja lähima objekti otsing kasutavad sama määratlust. */
proj4.defs('EPSG:3301','+proj=lcc +lat_0=57.51755393055556 +lon_0=24 +lat_1=59.33333333333334 +lat_2=58 +x_0=500000 +y_0=6375000 +ellps=GRS80 +units=m +no_defs');
register(proj4);
