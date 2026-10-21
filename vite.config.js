import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const authBackend = {
	name: 'radiowave-auth',
	async configureServer(server) {
		const { app } = await import('./src/webserver/server.js');
		server.middlewares.use(app);
	},
	async configurePreviewServer(server) {
		const { app } = await import('./src/webserver/server.js');
		server.middlewares.use(app);
	},
};

export default defineConfig({
	plugins: [
		authBackend,
		sveltekit(),
	],
	server: {
		host: '127.0.0.1',
		port: 5173,
		strictPort: true,
	},
	build: {

	}
});
