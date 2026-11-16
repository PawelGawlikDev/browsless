import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  MCP_BRIDGE_VERSION,
  MCP_MAX_BYTES,
  pairRequestSchema,
  bridgeResponseSchema,
  type BridgeRequest,
} from '../../../src/mcp/protocol';

type Pending = {
  request: BridgeRequest;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  delivered: boolean;
};
const equal = (a: string, b: string) => {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
};

export class ExtensionBridge {
  private code = randomBytes(16).toString('hex');
  private codeExpiresAt = Date.now() + 600_000;
  private session: { token: string; origin: string; lastSeen: number } | undefined;
  private pending = new Map<string, Pending>();
  private pairAttempts: number[] = [];
  private server = createServer((request, response) => {
    void this.handle(request, response).catch((error: unknown) => {
      this.respond(response, 400, {
        error: error instanceof Error ? error.message.slice(0, 4000) : 'Invalid request',
      });
    });
  });

  constructor(private port: number) {
    this.server.requestTimeout = 10_000;
    this.server.headersTimeout = 10_000;
  }

  async start() {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, '127.0.0.1', () => {
        this.server.removeListener('error', reject);
        const address = this.server.address();
        if (address && typeof address !== 'string') this.port = address.port;
        resolve();
      });
    });
  }

  connectionInfo() {
    if (this.session && Date.now() - this.session.lastSeen > 30_000) this.revoke();
    if (!this.session && Date.now() > this.codeExpiresAt) this.rotateCode();
    return {
      protocolVersion: MCP_BRIDGE_VERSION,
      port: this.port,
      connected: Boolean(this.session),
      ...(this.session ? {} : { pairingCode: this.code, expiresAt: this.codeExpiresAt }),
      instructions:
        'Open Browsless dashboard → Settings → External AI. Enter this port and pairing code, review draft-only access, then approve. Keep that dashboard window open. Never put the code in a URL or workflow.',
    };
  }

  async request(operation: BridgeRequest['operation'], input: BridgeRequest['input']) {
    if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MCP_MAX_BYTES / 2) {
      throw new Error('Tool input exceeds 256 KiB');
    }
    if (!this.session || Date.now() - this.session.lastSeen > 30_000) {
      throw new Error(
        'Browsless is not connected. Call get_connection_info and pair in Settings → External AI.'
      );
    }
    if (this.pending.size >= 16) throw new Error('Too many pending requests');
    const id = randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            'Extension response timed out. For draft creation, inspect the dashboard before retrying: it may have been saved.'
          )
        );
      }, 30_000);
      this.pending.set(id, {
        request: { id, operation, input },
        resolve,
        reject,
        timeout,
        delivered: false,
      });
    });
  }

  async close() {
    this.revoke();
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private rotateCode() {
    this.code = randomBytes(16).toString('hex');
    this.codeExpiresAt = Date.now() + 600_000;
  }

  private revoke() {
    this.session = undefined;
    this.rotateCode();
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('Extension disconnected'));
    }
    this.pending.clear();
  }

  private respond(response: ServerResponse, status: number, body: unknown) {
    if (response.writableEnded || response.destroyed) return;
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify(body));
  }

  private async readBody(request: IncomingMessage): Promise<unknown> {
    if (!request.headers['content-type']?.startsWith('application/json'))
      throw new Error('Expected application/json');
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MCP_MAX_BYTES) throw new Error('Request too large');
      chunks.push(buffer);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  private async handle(request: IncomingMessage, response: ServerResponse) {
    const origin = request.headers.origin;
    if (
      request.headers.host !== `127.0.0.1:${this.port}` ||
      !origin ||
      !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)
    ) {
      this.respond(response, 403, {
        error: 'Only Chrome extension origins on the exact loopback host are allowed',
      });
      return;
    }
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Browsless-Protocol'
      );
      response.setHeader('Access-Control-Allow-Private-Network', 'true');
      this.respond(response, 200, {});
      return;
    }
    if (
      request.method !== 'POST' ||
      request.headers['x-browsless-protocol'] !== String(MCP_BRIDGE_VERSION)
    ) {
      this.respond(response, 400, { error: 'Unsupported method or bridge protocol' });
      return;
    }
    if (request.url === '/pair') {
      this.pairAttempts = this.pairAttempts.filter((time) => Date.now() - time < 60_000);
      if (this.pairAttempts.length >= 5) {
        this.respond(response, 429, {
          error: 'Too many pairing attempts. Wait one minute.',
        });
        return;
      }
      this.pairAttempts.push(Date.now());
      const body = pairRequestSchema.parse(await this.readBody(request));
      if (this.session && Date.now() - this.session.lastSeen > 30_000) this.revoke();
      if (
        this.session ||
        Date.now() > this.codeExpiresAt ||
        origin !== `chrome-extension://${body.extensionId}` ||
        !equal(body.code, this.code)
      ) {
        this.respond(response, 403, {
          error: 'Pairing rejected: invalid/expired code or already paired',
        });
        return;
      }
      const token = randomBytes(32).toString('hex');
      this.session = { token, origin, lastSeen: Date.now() };
      this.code = '';
      this.respond(response, 200, { protocolVersion: MCP_BRIDGE_VERSION, token });
      return;
    }
    const session = this.session;
    if (
      !session ||
      session.origin !== origin ||
      Date.now() - session.lastSeen > 30_000 ||
      !equal(request.headers.authorization || '', `Bearer ${session.token}`)
    ) {
      this.respond(response, 401, { error: 'Session expired or revoked. Pair again.' });
      return;
    }
    session.lastSeen = Date.now();
    if (request.url === '/poll') {
      await this.readBody(request);
      const next = [...this.pending.values()].find((entry) => !entry.delivered);
      if (next) next.delivered = true;
      this.respond(response, 200, { request: next?.request || null });
    } else if (request.url === '/respond') {
      const body = bridgeResponseSchema.parse(await this.readBody(request));
      const entry = this.pending.get(body.id);
      if (!entry?.delivered) {
        this.respond(response, 409, { error: 'Request is no longer pending' });
        return;
      }
      clearTimeout(entry.timeout);
      this.pending.delete(body.id);
      if (body.ok) entry.resolve(body.result);
      else entry.reject(new Error(body.error || 'Extension rejected request'));
      this.respond(response, 200, {});
    } else if (request.url === '/disconnect') {
      this.revoke();
      this.respond(response, 200, {});
    } else {
      this.respond(response, 404, { error: 'Unknown endpoint' });
    }
  }
}
