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

// Artifact upload functions - each format gets its own file

/** Upload ASCII text artifact (.txt) */
export async function uploadAscii(generationId: string, stepId: number, artifactId: number, ascii: string): Promise<string> {
	const key = `${generationId}/${stepId}_${artifactId}.txt`;
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: ascii,
			ContentType: 'text/plain; charset=utf-8'
		})
	);
	debug('ASCII uploaded to %s', key);
	return key;
}

/** Upload SVG artifact (.svg) - used for gallery display */
export async function uploadSvg(generationId: string, stepId: number, artifactId: number, svg: string): Promise<string> {
	const key = `${generationId}/${stepId}_${artifactId}.svg`;
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: svg,
			ContentType: 'image/svg+xml'
		})
	);
	debug('SVG uploaded to %s', key);
	return key;
}

/** Upload PNG artifact (.png) - used for LLM refinement */
export async function uploadPng(generationId: string, stepId: number, artifactId: number, data: Uint8Array): Promise<string> {
	const key = `${generationId}/${stepId}_${artifactId}.png`;
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: data,
			ContentType: 'image/png'
		})
	);
	debug('PNG uploaded to %s', key);
	return key;
}

export async function deleteGenerationArtifacts(generationId: string): Promise<void> {
	debug('Deleting artifacts for generation %s', generationId);
	// Note: For proper cleanup, you'd list objects with prefix and delete them.
	// For now, this is a placeholder - S3 lifecycle rules can handle cleanup.
	debug('Deletion not implemented - use S3 lifecycle rules for cleanup');
}
