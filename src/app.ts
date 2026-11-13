import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { config } from './config.js';
import { authRoutes } from './auth.js';

export function buildApp() {
	const app = Fastify({ logger: true });

	app.register(jwt, { secret: config.JWT_SECRET });

	app.get('/health', async () => {
		return { status: 'ok' };
	});

	authRoutes(app);

	return app;
}
