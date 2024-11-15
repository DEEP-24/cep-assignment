import type { DataFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { getS3SignedUrl } from "~/models/s3.server"

export const loader = async ({ request }: DataFunctionArgs) => {
  const url = new URL(request.url)
  const { searchParams } = url

  const key = searchParams.get("key")
  if (!key) return json({ error: "No key provided" })

  const signedUrl = await getS3SignedUrl(key)

  return json({ signedUrl })
}