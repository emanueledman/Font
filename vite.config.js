import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/', // Garante que os caminhos sejam relativos
    build: {
        outDir: 'dist', // Confirma que o build gera o diretório dist
        assetsDir: 'assets'
    }
});