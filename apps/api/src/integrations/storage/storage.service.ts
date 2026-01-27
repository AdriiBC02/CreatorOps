import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/index.js';

export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.storage.bucket;

    this.s3Client = new S3Client({
      endpoint: `http${config.storage.useSSL ? 's' : ''}://${config.storage.endpoint}:${config.storage.port}`,
      region: 'us-east-1', // MinIO doesn't care about region
      credentials: {
        accessKeyId: config.storage.accessKey,
        secretAccessKey: config.storage.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getFileUrl(key: string): Promise<string> {
    // Return direct URL for MinIO
    const protocol = config.storage.useSSL ? 'https' : 'http';
    return `${protocol}://${config.storage.endpoint}:${config.storage.port}/${this.bucket}/${key}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.replace(`/${this.bucket}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return this.getFileUrl(key);
  }
}
