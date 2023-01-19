import type { Handler } from 'express';
import BaseAdapter, { type Image, type ReadOptions } from 'ghost-storage-base';

class S3Adapter extends BaseAdapter {
  constructor() {
    super();
  }

  exists = async (_filename: string, _targetDir?: string): Promise<boolean> => {
    return true;
  };

  save = async (_image: Image, _targetDir?: string): Promise<string> => {
    return '';
  };

  serve = (): Handler => {
    return (_req, _res, _next) => {};
  };

  delete = async (_filename: string, _targetDir?: string): Promise<boolean> => {
    return true;
  };

  read = async (_options?: ReadOptions): Promise<Buffer> => {
    return Buffer.from('');
  };
}

export default S3Adapter;
