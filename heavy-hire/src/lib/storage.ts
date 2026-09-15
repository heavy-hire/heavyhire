import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}) {
  const { key, contentType } = params;

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error("Unsupported file type");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL_BASE;

  if (!bucket || !publicUrlBase) {
    throw new Error("R2 storage is not configured");
  }

  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl };
}
