import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
  } from "@aws-sdk/client-s3"
  import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
  import { ulid } from "ulid"
  
  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  })
  
  class R2 {
    #client = r2Client
    #publicUrl = process.env.R2_PUBLIC_URL
    #bucket = process.env.R2_BUCKET_NAME
  
    private generateKey(userId: number) {
      return `${userId}/${ulid()}`
    }
  
    private getPublicUrl(key: string) {
      return `${this.#publicUrl}/${key}`
    }
  
    async getPresignedUrl({ userId }: { userId: number }) {
      const key = this.generateKey(userId)
      const signedUrl = await getSignedUrl(
        this.#client,
        new PutObjectCommand({
          Bucket: this.#bucket,
          Key: key,
        }),
        { expiresIn: 60 },
      )
  
      return {
        url: signedUrl,
        key,
        publicUrl: this.getPublicUrl(key),
      }
    }
  
    async deleteFile(key: string) {
      await this.#client.send(
        new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }),
      )
    }
  
    async getSignedUrl(key: string) {
      const command = new GetObjectCommand({
        Bucket: this.#bucket,
        Key: key,
      })
  
      return getSignedUrl(this.#client, command, { expiresIn: 60 })
    }
  }
  
  export const r2 = new R2()