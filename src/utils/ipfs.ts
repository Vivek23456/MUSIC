import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import { create, IPFSHTTPClient } from 'ipfs-http-client';

// Configure IPFS client - using public gateway
const projectId = import.meta.env.VITE_IPFS_PROJECT_ID || '';
const projectSecret = import.meta.env.VITE_IPFS_PROJECT_SECRET || '';

const auth = projectId && projectSecret 
  ? 'Basic ' + btoa(projectId + ':' + projectSecret)
  : undefined;

let ipfsClient: IPFSHTTPClient;

try {
  ipfsClient = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: auth ? {
      authorization: auth,
    } : {},
  });
} catch (error) {
  console.error('Failed to initialize IPFS client:', error);
  // Fallback to public gateway
  ipfsClient = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
  });
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface IPFSUploadResult {
  cid: string;
  size: number;
  path: string;
}

/**
 * Upload a file to IPFS
 * @param file File to upload
 * @param onProgress Progress callback
 * @returns IPFS CID and metadata
 */
export async function uploadToIPFS(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<IPFSUploadResult> {
  try {
    const fileBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(fileBuffer);

    // Upload to IPFS
    const result = await ipfsClient.add(buffer, {
      progress: (bytes) => {
        if (onProgress) {
          onProgress({
            loaded: bytes,
            total: file.size,
            percentage: (bytes / file.size) * 100,
          });
        }
      },
    });

    return {
      cid: result.path,
      size: result.size,
      path: result.path,
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload file to IPFS');
  }
}

/**
 * Get IPFS gateway URL for a CID
 * @param cid IPFS Content Identifier
 * @returns Full IPFS gateway URL
 */
export function getIPFSUrl(cid: string): string {
  // Use multiple gateways for reliability
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
  ];
  
  // Return first gateway (can be enhanced with fallback logic)
  return `${gateways[0]}${cid}`;
}

/**
 * Validate audio file
 * @param file File to validate
 * @returns true if valid audio file
 */
export function validateAudioFile(file: File): boolean {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload MP3, WAV, or OGG files.');
  }

  if (file.size > maxSize) {
    throw new Error('File size exceeds 100MB limit.');
  }

  return true;
}

/**
 * Extract audio metadata using Web Audio API
 * @param file Audio file
 * @returns Audio duration in seconds
 */
export async function extractAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(Math.floor(audio.duration));
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Format duration from seconds to MM:SS
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
