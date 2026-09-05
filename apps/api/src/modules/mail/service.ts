import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import type {
  SmtpStatusResponse,
  DkimRecordResponse,
  VirtualDomain,
  SendTestEmailInput,
  TestEmailResultResponse,
} from "@vexlyx/shared";

export class MailError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "MailError";
  }
}

function getPostfixManagerScriptPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, "../../../../../system/python/postfix_manager.py"),
    resolve(currentDir, "../../../../system/python/postfix_manager.py"),
    resolve(process.cwd(), "../../system/python/postfix_manager.py"),
    resolve(process.cwd(), "system/python/postfix_manager.py"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? resolve(process.cwd(), "system/python/postfix_manager.py");
}

function getPythonExe(): string {
  if (process.env.PYTHON_PATH && existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  if (process.platform === "win32") {
    const candidates = [
      resolve(process.cwd(), "Python/pythoncore-3.14-64/python.exe"),
      resolve(process.cwd(), "apps/api/Python/pythoncore-3.14-64/python.exe"),
      resolve(process.cwd(), "../../apps/api/Python/pythoncore-3.14-64/python.exe"),
      resolve(process.env.LOCALAPPDATA || "", "Python/pythoncore-3.14-64/python.exe"),
      resolve(process.env.USERPROFILE || "", "AppData/Local/Python/pythoncore-3.14-64/python.exe"),
    ];
    for (const c of candidates) {
      if (c && existsSync(c)) {
        return c;
      }
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

async function runPostfixManager<T = Record<string, unknown>>(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const scriptPath = getPostfixManagerScriptPath();
  const pythonExe = getPythonExe();

  return new Promise((res, rej) => {
    const child = spawn(pythonExe, [scriptPath, command], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      rej(new MailError(`Failed to spawn postfix_manager: ${err.message}`, "SPAWN_ERROR", 500));
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        rej(new MailError(`postfix_manager failed (code ${code}): ${stderr}`, "PROCESS_ERROR", 500));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as T;
        res(parsed);
      } catch {
        rej(new MailError(`Failed to parse manager response: ${stdout}`, "PARSE_ERROR", 500));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export class MailService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Probes and returns Postfix SMTP and OpenDKIM service health.
   */
  async getStatus(): Promise<SmtpStatusResponse> {
    const host = process.env.SMTP_HOST || "127.0.0.1";
    const result = await runPostfixManager<SmtpStatusResponse>("status", { host });
    return result;
  }

  /**
   * Retrieves all virtual domains for a user, checking their DKIM signing keys and DNS setup.
   */
  async listVirtualDomains(userId: string): Promise<VirtualDomain[]> {
    const domains = await this.prisma.domain.findMany({
      where: { userId },
      include: {
        mailboxes: true,
        dnsRecords: {
          where: {
            type: "TXT",
            name: "default._domainkey",
          },
        },
      },
      orderBy: { hostname: "asc" },
    });

    const result: VirtualDomain[] = [];

    for (const d of domains) {
      // Check existing DKIM record from python manager
      const dkim = await runPostfixManager<{
        found: boolean;
        domain: string;
        selector: string;
        dnsRecordName: string;
        dnsRecordValue: string;
        publicKey: string;
      }>("get_dkim", { domain: d.hostname, selector: "default" });

      const hasDnsTxt = d.dnsRecords.length > 0;

      result.push({
        domainId: d.id,
        hostname: d.hostname,
        status: d.status,
        dkimEnabled: dkim.found,
        dkimRecord: dkim.found
          ? {
              domain: dkim.domain,
              selector: dkim.selector,
              dnsRecordName: dkim.dnsRecordName,
              dnsRecordValue: dkim.dnsRecordValue,
              publicKey: dkim.publicKey,
              keyLength: 2048,
              inDns: hasDnsTxt,
            }
          : undefined,
        mailboxCount: d.mailboxes.length,
      });
    }

    return result;
  }

  /**
   * Synchronizes active domains from the database to Postfix virtual domains map.
   */
  async syncVirtualDomains(userId: string): Promise<{ success: boolean; syncedCount: number; domains: string[] }> {
    const domains = await this.prisma.domain.findMany({
      where: { userId },
      select: { hostname: true },
    });

    const hostnames = domains.map((d) => d.hostname);
    const syncRes = await runPostfixManager<{ success: boolean; syncedCount: number; domains: string[] }>(
      "sync_virtual_domains",
      { domains: hostnames },
    );

    return syncRes;
  }

  /**
   * Generates or retrieves 2048-bit RSA DKIM keys and formats DNS TXT record for a domain.
   * Also optionally auto-adds the TXT record to CoreDNS zone if domain exists.
   */
  async getOrGenerateDkim(userId: string, domainId: string, autoAddToDns: boolean = true): Promise<DkimRecordResponse> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, userId },
      include: {
        dnsRecords: true,
      },
    });

    if (!domain) {
      throw new MailError("Domain not found or unauthorized", "DOMAIN_NOT_FOUND", 404);
    }

    const dkimRes = await runPostfixManager<DkimRecordResponse & { isNew: boolean }>("generate_dkim", {
      domain: domain.hostname,
      selector: "default",
      keyLength: 2048,
    });

    let inDns = false;
    const existingDns = domain.dnsRecords.find(
      (r) => r.type === "TXT" && r.name === "default._domainkey",
    );

    if (existingDns) {
      inDns = true;
    } else if (autoAddToDns) {
      // Auto-insert DKIM TXT record into Vexlyx DNS
      await this.prisma.dnsRecord.create({
        data: {
          type: "TXT",
          name: "default._domainkey",
          value: `"${dkimRes.dnsRecordValue}"`,
          ttl: 3600,
          domainId: domain.id,
        },
      });
      inDns = true;
    }

    return {
      domain: dkimRes.domain,
      selector: dkimRes.selector,
      dnsRecordName: dkimRes.dnsRecordName,
      dnsRecordValue: dkimRes.dnsRecordValue,
      publicKey: dkimRes.publicKey,
      keyLength: dkimRes.keyLength ?? 2048,
      inDns,
    };
  }

  /**
   * Sends a test email via Postfix SMTP, returning the full SMTP handshake transcript.
   */
  async sendTestEmail(userId: string, input: SendTestEmailInput): Promise<TestEmailResultResponse> {
    const host = process.env.SMTP_HOST || "127.0.0.1";
    const payload = {
      ...input,
      host,
    };

    const result = await runPostfixManager<TestEmailResultResponse>("send_test_email", payload);
    return result;
  }

  /**
   * Verifies open relay protection by simulating an unauthorized external-to-external delivery.
   */
  async testOpenRelay(): Promise<{ safe: boolean; relayDenied: boolean; rcptResponse: string; transcript: string[] }> {
    const host = process.env.SMTP_HOST || "127.0.0.1";
    const port = Number(process.env.SMTP_PORT || 25);
    const result = await runPostfixManager<{
      safe: boolean;
      relayDenied: boolean;
      rcptResponse: string;
      transcript: string[];
    }>("test_relay", { host, port });
    return result;
  }
}
