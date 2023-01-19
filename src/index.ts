import { strict as assert } from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Readable } from 'stream';

import type { Handler } from 'express';
import BaseAdapter, { type Image, type ReadOptions } from 'ghost-storage-base';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

interface S3AdapterConfigType {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  pathPrefix?: string;
  assetUrl?: string;
  acl?: string;
  forcePathStyle?: string | boolean;
}

class S3Adapter extends BaseAdapter {
  accessKeyId;
  secretAccessKey;
  region;
  bucket;
  endpoint;
  pathPrefix;
  assetUrl;
  acl;
  forcePathStyle = false;

  constructor(config: S3AdapterConfigType) {
    super();

    const { accessKeyId, secretAccessKey, region, bucket, endpoint, pathPrefix, assetUrl, acl, forcePathStyle } =
      config ?? {};

    // check that all required configuration has been provided
    assert(accessKeyId, `accessKeyId must be provided in the storage adapter configuration`);
    assert(secretAccessKey, `secretAccessKey must be provided in the storage adapter configuration`);
    assert(region, `region must be provided in the storage adapter configuration`);
    assert(bucket, `bucket must be provided in the storage adapter configuration`);

    // required configuration
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey; // @todo support loading secret from a file
    this.region = region;
    this.bucket = bucket;

    // optional configuration
    this.endpoint = endpoint || undefined;
    this.pathPrefix = pathPrefix || '';
    this.assetUrl = assetUrl || '/content/images/';

    // set forcePathStyle to boolean true or string 'true' to enable it - anything else will set it to false
    this.forcePathStyle = forcePathStyle === true || forcePathStyle === 'true';

    // default to uploading all objects as publicly readable
    this.acl = acl || 'public-read';
  }

  // create an S3 client
  get s3() {
    const options: S3ClientConfig = {
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: this.forcePathStyle,
    };

    if (this.endpoint) options.endpoint = this.endpoint;

    return new S3Client(options);
  }

  #getS3Key = (fileName?: string, targetDir?: string) => {
    const directory = targetDir ?? this.getTargetDir(this.pathPrefix);
    return join(directory, fileName ?? '').replace(/^\//, '');
  };

  #pathToKey = (path: string) => {
    // strip asset URL prefix and remove leading and trailing slashes
    return path.substring(this.assetUrl.length).replace(/\/+$/, '').replace(/^\//, '');
  };

  #isS3Path = (path: string) => path.startsWith(this.assetUrl);

  /**
   * Check to see whether a file alrady exists in storage
   *
   * @param {string} fileName  Base name of the file being uploaded, e.g. my-photo.jpg
   * @param {string} targetDir Desired target directory for storage, e.g. ${this.pathPrefix}/{YEAR}/{MONTH}
   * @returns {boolean} true if the file already exists, false otherwise
   */
  async exists(fileName: string, targetDir?: string): Promise<boolean> {
    try {
      const response = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.#getS3Key(fileName, targetDir),
        })
      );
      return response.$metadata.httpStatusCode === 200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save an image
   *
   * @param {object} image       Object containing details about the image being saved
   * @param {string} [targetDir] Desired target directory for storage, e.g. ${this.pathPrefix}/{YEAR}/{MONTH}
   * @returns {boolean} true if the file already exists, false otherwise
   */
  async save(image: Image, targetDir?: string): Promise<string> {
    const fileName = await this.getUniqueFileName(image, this.#getS3Key(undefined, targetDir));
    const file = await readFile(image.path);

    const options: PutObjectCommandInput = {
      ACL: this.acl,
      Body: file,
      Bucket: this.bucket,
      CacheControl: `max-age=${30 * 24 * 60 * 60}`,
      ContentType: image.type,
      Key: fileName.replace(/^\//, ''),
    };

    await this.s3.send(new PutObjectCommand(options));

    if (this.assetUrl.startsWith('/')) {
      // return a relative URL
      // this is a workaround for the lack of good relative URL resolution
      const url = new URL(fileName, new URL(this.assetUrl, 'https://www.ghost.org/'));
      return url.pathname;
    } else {
      // return an absolute URL (either the specified asset URL or S3 direct access URL)
      const url = new URL(fileName, this.assetUrl);
      return url.href;
    }
  }

  serve(): Handler {
    return async (req, res, _next) => {
      try {
        // req.path = '/{YEAR}/{MONTH}/my-photo.jpg';
        const { path } = req;

        // remove leading slashes to create the object key
        const response = await this.s3.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: path.replace(/^\//, ''),
          })
        );

        if (response.$metadata.httpStatusCode !== 200) {
          throw new Error(`File not found in S3 storage: ${path}`);
        }

        res.statusCode = 200;

        response.CacheControl && res.header('cache-control', response.CacheControl);
        response.ContentLength && res.header('content-length', `${response.ContentLength}`);
        response.ContentType && res.header('content-type', response.ContentType);
        response.ETag && res.header('etag', response.ETag);
        response.LastModified && res.header('last-modified', `${response.LastModified}`);

        // @todo use streams to pipe the body
        const body = await new Promise<Buffer>((resolve, reject) => {
          const stream = response.Body as Readable;
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.once('end', () => resolve(Buffer.concat(chunks)));
          stream.once('error', reject);
        });

        res.send(body);
      } catch (e) {
        res.status(404).send(`File not found`);
      }
    };
  }

  async delete(fileName: string, targetDir?: string): Promise<boolean> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.#getS3Key(fileName, targetDir),
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async read(options?: ReadOptions): Promise<Buffer> {
    let { path = '' } = options ?? {};

    // verify this is an asset stored in S3
    if (!this.#isS3Path(path)) {
      throw new Error(`Asset [${path}] is not a valid S3 path`);
    }

    const Key = this.#pathToKey(path);

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key,
        })
      );

      const stream = response.Body as Readable;

      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.once('end', () => resolve(Buffer.concat(chunks)));
        stream.once('error', reject);
      });
    } catch (e) {
      throw new Error(`Could not retrieve S3 object at key: ${Key}`);
    }
  }
}

export default S3Adapter;
