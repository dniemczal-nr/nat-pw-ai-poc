import crypto from 'crypto';
import type { APIRequestContext } from '@playwright/test';
import * as config from '../config';

export type MinioSettings = {
  host: string;
  port: number;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
};

function requireConfigValue(key: string): string {
  const value = config.get(key);
  if (!value || value.includes('${')) {
    throw new Error(
      `MinIO config error: missing or unresolved "${key}" (got: "${value}"). ` +
        'Set via config/local.properties or ENV (MINIO_HOST, MINIO_PORT, MINIO_USER, MINIO_PASSWORD).',
    );
  }
  return value;
}

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) => crypto.createHmac('sha256', key).update(data).digest();
/** RFC 3986 encoding, as S3 signs it. */
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * S3 client for the MinIO batch data interface (AWS Signature V4). Every call names one exact object
 * key, so nothing is matched by prefix by accident — the console API decodes prefixes on its own.
 */
export class MinioClient {
  constructor(private readonly api: APIRequestContext) {}

  assertConfigured(): MinioSettings {
    return {
      host: requireConfigValue('minio.host').replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      port: Number(config.getOrDefault('minio.port', '443')),
      accessKey: requireConfigValue('minio.accessKey'),
      secretKey: requireConfigValue('minio.secretKey'),
      region: config.getOrDefault('minio.region', 'us-east-1'),
      bucket: requireConfigValue('minio.bucket'),
    };
  }

  async exists(key: string): Promise<boolean> {
    const response = await this.send('HEAD', key);
    if (response.status === 404) return false;
    if (response.status !== 200) throw new Error(`MinIO HEAD ${key}: HTTP ${response.status}`);
    return true;
  }

  async get(key: string): Promise<Buffer | undefined> {
    const response = await this.send('GET', key);
    if (response.status === 404) return undefined;
    if (response.status !== 200) throw new Error(`MinIO GET ${key}: HTTP ${response.status} ${response.body.toString().slice(0, 300)}`);
    return response.body;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const response = await this.send('PUT', key, body);
    if (response.status !== 200) throw new Error(`MinIO PUT ${key}: HTTP ${response.status} ${response.body.toString().slice(0, 300)}`);
  }

  /** Keys under `prefix` (ListObjectsV2, every page). */
  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const query: Record<string, string> = { 'list-type': '2', prefix, ...(token ? { 'continuation-token': token } : {}) };
      const response = await this.send('GET', '', undefined, query);
      if (response.status !== 200) throw new Error(`MinIO list ${prefix}: HTTP ${response.status}`);
      const xml = response.body.toString('utf8');
      keys.push(...[...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => decodeXml(m[1])));
      token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decodeXml(/<NextContinuationToken>([^<]*)</.exec(xml)?.[1] ?? '') : undefined;
    } while (token);
    return keys;
  }

  private async send(method: string, key: string, body: Buffer = Buffer.alloc(0), query: Record<string, string> = {}) {
    const s = this.assertConfigured();
    const path = key ? `/${s.bucket}/${key.split('/').map(encode).join('/')}` : `/${s.bucket}`;
    const queryString = Object.keys(query)
      .sort()
      .map((k) => `${encode(k)}=${encode(query[k])}`)
      .join('&');
    const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
    const day = amzDate.slice(0, 8);
    const payloadHash = sha256(body);
    const hostHeader = s.port === 443 ? s.host : `${s.host}:${s.port}`;
    const headers: Record<string, string> = { host: hostHeader, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const signedHeaders = Object.keys(headers).sort();
    const canonical = [
      method,
      path,
      queryString,
      ...signedHeaders.map((h) => `${h}:${headers[h]}`),
      '',
      signedHeaders.join(';'),
      payloadHash,
    ].join('\n');
    const scope = `${day}/${s.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
    const signingKey = [s.region, 's3', 'aws4_request'].reduce<Buffer>((k, part) => hmac(k, part), hmac(`AWS4${s.secretKey}`, day));
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${s.accessKey}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;

    const url = `https://${hostHeader}${path}${queryString ? `?${queryString}` : ''}`;
    const response = await this.api.fetch(url, { method, headers, data: method === 'PUT' ? body : undefined });
    return { status: response.status(), body: method === 'HEAD' ? Buffer.alloc(0) : await response.body() };
  }
}

function decodeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
