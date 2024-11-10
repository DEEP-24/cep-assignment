export function getS3Url(key: string, options: { bucket: string; region: string }) {
  // For client-side, we'll generate a simple URL
  return `https://${options.bucket}.s3.${options.region}.amazonaws.com/${key}`;
}