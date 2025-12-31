import dbg from 'debug';
const debug = dbg('app:utils');
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PUBLIC_CLOUDFRONT_URL } from '$env/static/public';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/** Build CloudFront URL for an input image (standalone, no generation prefix) */
export function getInputImageUrl(imageId: string, extension: string): string {
	return `https://${PUBLIC_CLOUDFRONT_URL}/input/${imageId}.${extension}`;
}

/** Build CloudFront URL for a rendered artifact PNG */
export function getRenderedArtifactUrl(generationId: string, stepId: number, artifactId: number): string {
	return `https://${PUBLIC_CLOUDFRONT_URL}/${generationId}/${stepId}_${artifactId}.png`;
}
