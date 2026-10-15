import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 base:'/jahiselts/',
 plugins:[react()],
 build:{
  rollupOptions:{
   output:{
    manualChunks(id){
     if(id.includes('/node_modules/react'))return 'react';
     if(id.includes('/node_modules/@supabase'))return 'supabase';
     if(id.includes('/node_modules/ol/'))return 'map';
     if(id.includes('/node_modules/proj4/'))return 'projection';
     if(id.includes('/node_modules/lucide-react/'))return 'icons';
    }
   }
  }
 }
});
