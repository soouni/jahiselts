import {defaults} from 'ol/interaction/defaults.js';

// Touch browsers may not focus a tabindex-enabled map on pointerdown.
// Panning must work immediately while keyboard navigation keeps its Tab target.
export function mapInteractions(){return defaults({onFocusOnly:false});}
