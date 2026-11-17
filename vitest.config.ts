import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
// Komponenditestid jooksevad eraldi jsdom-keskkonnas; ühiktestid jäävad `node --test` alla.
export default defineConfig({
 plugins:[react()],
 test:{environment:'jsdom',include:['tests/components/**/*.test.tsx'],restoreMocks:true}
});
