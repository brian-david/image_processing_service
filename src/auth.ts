import type { FastifyInstance } from 'fastify';
import * as z from 'zod';

const Credentials = z.object({
	username: z
		.string()
		.trim()
		.min(3)
		.max(32)
		.regex(/^[a-zA-Z0-9_]+$/, 'only letters, numbers and underscores'),
	password: z.string().min(8).max(128),
});

export function authRoutes(app: FastifyInstance) {
	app.post('/register', async (request, reply) => {
		const result = Credentials.safeParse(request.body);
		if (!result.success) {
			return reply.code(400).send({ error: z.prettifyError(result.error) });
		}
		const { username } = result.data;
		return { username };
	});
}
