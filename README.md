# Ghost S3 Storage Adapter

A storage adapter for the [Ghost blogging platform](https://ghost.org/) to support AWS S3 compatible storage backends.

> **WARNING:** This is pre-production code and still under active development. Use at your own risk.

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
    # ...
    volumes:
      - /path/to/Ghost-Storage-S3/lib/index.js:/var/lib/ghost/content/adapters/storage/s3/index.js
```

## Configuration

## Defining configuration variables

Configuration variables can be specified in one of two ways:

1. In the Ghost JSON configuration file (`config.production.json`)
2. Via environment variables to override the Ghost configuration

### Option 1: Ghost configuration file

You'll need to add a new section in your `config.production.json` file as follows:

```json
// ...
  "adapters": {
    "storage": {
      "active": "s3",
      "s3": {
        "accessKeyId": "...",
        "secretAccessKey": "...",
        "region": "...",
        "bucket": "...",
        // ...
      }
    }
  }
// ...
```

### Option 2: Environment variables

Ghost supports overriding the runtime configuration using environment variables - this is particularly useful in a Docker installation.

The required format is to represent the JSON nesting structure using two underscores for each nested level (i.e. `__`), for example the following `docker-compose.yaml` excerpt:

```yaml
services:
  ghost:
    image: ghost:latest
    # ...
    environment:
      adapters__storage__active: s3
      adapters__storage__s3__accessKeyId: 1234567890
      adapters__storage__s3__secretAccessKey: pLMnrK86BLbaeLrCIS62DiFLGVrbnxMgJiVWmWwN
      adapters__storage__s3__region: us-east-1
      adapters__storage__s3__bucket: your-bucket-name
```

### Sample configurations

Regardless of which S3-compatible storage provider you choose, the following configuration variables are always required:

| Configuration   | Example                                    |
| --------------- | ------------------------------------------ |
| accessKeyId     | `1234567890`                               |
| secretAccessKey | `pLMnrK86BLbaeLrCIS62DiFLGVrbnxMgJiVWmWwN` |
| region          | `us-east-1`                                |
| bucket          | `your-bucket-name`                         |

Below are some examples for the additional configuration you need for various S3-compatible storage providers. These should be provided in addition to the mandatory configuration variables above.

#### Backblaze B2

| Configuration | Required | Example                                               |
| ------------- | -------- | ----------------------------------------------------- |
| endpoint      | Yes      | `https://s3.us-west-002.backblazeb2.com`              |
| assetUrl      | No       | `https://f002.backblazeb2.com/file/your-bucket-name/` |

#### Linode

| Configuration | Required | Example                                                 |
| ------------- | -------- | ------------------------------------------------------- |
| endpoint      | Yes      | `https://us-east-1.linodeobjects.com`                   |
| assetUrl      | No       | `https://your-bucket-name.us-east-1.linodeobjects.com/` |
