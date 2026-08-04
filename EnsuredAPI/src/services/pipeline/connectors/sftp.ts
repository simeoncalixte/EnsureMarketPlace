/**
 * SFTP connector wrapper using `ssh2-sftp-client` (dynamically imported).
 */
let SftpClientModule: any;

async function loadClient() {
  if (!SftpClientModule) {
    const mod = await import('ssh2-sftp-client');
    SftpClientModule = mod.default ?? mod;
  }
  return SftpClientModule;
}

class SftpConnector {
  private client: any | null = null;
  private connected = false;

  constructor() {}

  async connect(opts?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  }) {
    const Client = await loadClient();
    if (!this.client) this.client = new Client();
    const cfg = {
      host: opts?.host ?? process.env.SFTP_HOST,
      port: opts?.port ?? (process.env.SFTP_PORT ? Number(process.env.SFTP_PORT) : 22),
      username: opts?.username ?? process.env.SFTP_USERNAME,
      password: opts?.password ?? process.env.SFTP_PASSWORD,
      privateKey: opts?.privateKey ?? process.env.SFTP_PRIVATE_KEY,
      passphrase: opts?.passphrase ?? process.env.SFTP_PASSPHRASE,
    };
    await this.client.connect(cfg);
    this.connected = true;
    return this.client;
  }

  private async ensureConnected() {
    if (!this.client || !this.connected) await this.connect();
  }

  async get(remotePath: string): Promise<Buffer> {
    await this.ensureConnected();
    const data = await this.client.get(remotePath);
    if (Buffer.isBuffer(data)) return data;
    if (data && typeof data.pipe === 'function') {
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        data.on('data', (c: Buffer) => chunks.push(c));
        data.on('end', () => resolve(Buffer.concat(chunks)));
        data.on('error', (err: any) => reject(err));
      });
    }
    return Buffer.from(String(data ?? ''));
  }

  async put(buffer: Buffer, remotePath: string) {
    await this.ensureConnected();
    return this.client.put(buffer, remotePath);
  }

  async list(remotePath: string) {
    await this.ensureConnected();
    return this.client.list(remotePath);
  }

  async delete(remotePath: string) {
    await this.ensureConnected();
    return this.client.delete(remotePath);
  }

  async end() {
    if (this.client) {
      try {
        await this.client.end();
      } catch (e) {}
      this.client = null;
      this.connected = false;
    }
  }
}

export const sftpConnector = new SftpConnector();
