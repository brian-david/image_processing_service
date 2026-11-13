import { loadEnvFile } from 'node:process';
import * as z from 'zod';

try {
	loadEnvFile('.env');
} catch (err) {
	// No .env file is fine (real environment variables are used instead).
	if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
}

const EnvSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),
	PORT: z.coerce.number().int().positive().default(3000),
	DATABASE_URL: z.url(),
	S3_ENDPOINT: z.url(),
	S3_REGION: z.string().min(1).default('us-east-1'),
	S3_BUCKET: z.string().min(1).default('images'),
	RUSTFS_ACCESS_KEY: z.string().min(1),
	RUSTFS_SECRET_KEY: z.string().min(1),
	JWT_SECRET: z.string().min(32),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
	console.error(
		'Invalid environment configuration:\n' + z.prettifyError(result.error),
	);
	process.exit(1);
}

export const config = result.data;
