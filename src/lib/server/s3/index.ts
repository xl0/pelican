import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION } from '$env/static/private';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import dbg from 'debug';

const debug = dbg('app:server:s3');

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp'
};

const ARTIFACT_CONTENT_TYPES: Record<string, string> = {
	svg: 'image/svg+xml',
	ascii: 'text/plain; charset=utf-8'
};

const s3 = new S3Client({
	region: S3_REGION || 'us-east-1',
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY
	}
});

export async function uploadInputImage(imageId: string, data: Uint8Array, extension: string): Promise<string> {
	debug('Uploading input image %s', imageId);

	const key = `input/${imageId}.${extension}`;
	const contentType = IMAGE_CONTENT_TYPES[extension] ?? 'application/octet-stream';

	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: data,
			ContentType: contentType
		})
	);

	debug('Input image uploaded to %s', key);
	return key;
}

const ARTIFACT_EXTENSIONS: Record<string, string> = {
	svg: 'svg',
	ascii: 'txt'
};

export async function uploadStepArtifact(
	generationId: string,
	stepId: number,
	artifactId: number,
	content: string,
	format: 'svg' | 'ascii'
): Promise<string> {
	debug('Uploading artifact for generation %s, step %d', stepId, artifactId);

	const extension = ARTIFACT_EXTENSIONS[format];
	const key = `${generationId}/${stepId}_${artifactId}.${extension}`;
	const contentType = ARTIFACT_CONTENT_TYPES[format];

	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: content,
			ContentType: contentType
		})
	);

	debug('Artifact uploaded to %s', key);
	return key;
}

export async function deleteGenerationArtifacts(generationId: string): Promise<void> {
	debug('Deleting artifacts for generation %s', generationId);
	// Note: For proper cleanup, you'd list objects with prefix and delete them.
	// For now, this is a placeholder - S3 lifecycle rules can handle cleanup.
	debug('Deletion not implemented - use S3 lifecycle rules for cleanup');
}
