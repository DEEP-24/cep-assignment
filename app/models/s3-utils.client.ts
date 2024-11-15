import invariant from "tiny-invariant";

declare global {
  interface Window {
    ENV: {
      AWS_REGION: string;
      AWS_BUCKET: string;
    };
  }
}

const REGION = "us-west-2";
const BUCKET = "s3cep";

invariant(REGION, "Missing AWS_REGION");
invariant(BUCKET, "Missing AWS_BUCKET");

/**
 * Returns a unique filename for S3
 */
  
export function getUniqueS3Key(fileName: string, extension?: string) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const finalExtension = extension || fileName.split('.').pop() || '';
  return `uploads/${timestamp}-${randomString}${finalExtension}`;
}

/**
 * Generates a URL for accessing an object in an S3 bucket.
 */
export function getS3Url(key: string, options: { bucket: string; region: string }) {
  // Encode the key only once when generating the final URL
  const encodedKey = encodeURIComponent(key);
  return `https://${options.bucket}.s3.${options.region}.amazonaws.com/${encodedKey}`;
}