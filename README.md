# Ghost S3 Storage Adapter

A storage adapter for the [Ghost blogging platform](https://ghost.org/) to support AWS S3 compatible storage backends.

## Installation
Based on the [Ghost config documentation](https://ghost.org/docs/config/#creating-a-custom-storage-adapter), to install a custom storage adapter the file needs to be placed in `content/adapters/storage`, relative to the Ghost project root.

### Option 1: Copy the files

This is the simplest and works well in a non-Docker install.

```shell
npm run build
mkdir -p ./content/adapters/storage
cp -r ./lib ./content/adapters/storage/s3
```

### Option 2: Bind mount the files (Docker)

If you are running Ghost with Docker, the easiest option is to bind mount the relevant S3 storage adapter JavaScript file directly into the path where Ghost expects to find it.

The advantage of this approach is that no changes need to be made to the underlying Docker image.

To do this, run `npm run build` to generate the adapter file which can then be found in `./lib/index.js`.

Here is a sample `docker-compose.yaml` file modified with the bind mount:

```yaml
services:
  ghost:
    image: ghost:latest
    ...
    volumes:
      - /path/to/ghost/blog:/var/lib/ghost/content
      - /path/to/ghost-storage-s3/file.js:/path/to/ghost/blog:/var/lib/ghost/content/adapters/storage/s3.js:ro
```
