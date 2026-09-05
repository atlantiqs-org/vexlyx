import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import type {
  SmtpStatusResponse,
  ImapStatusResponse,
  WebmailStatusResponse,
  DkimRecordResponse,
  VirtualDomain,
  SendTestEmailInput,
  TestEmailResultResponse,
  MailAuthCheck,
  MailAuthStatusResponse,
} from "@vexlyx/shared";
import { env } from "../../config/env.js";
import { DnsService } from "../domains/dns-service.js";

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

function getDovecotManagerScriptPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, "../../../../../system/python/dovecot_manager.py"),
    resolve(currentDir, "../../../../system/python/dovecot_manager.py"),
    resolve(process.cwd(), "../../system/python/dovecot_manager.py"),
    resolve(process.cwd(), "system/python/dovecot_manager.py"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? resolve(process.cwd(), "system/python/dovecot_manager.py");
}

function getWebmailManagerScriptPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDir, "../../../../../system/python/webmail_manager.py"),
    resolve(currentDir, "../../../../system/python/webmail_manager.py"),
    resolve(process.cwd(), "../../system/python/webmail_manager.py"),
    resolve(process.cwd(), "system/python/webmail_manager.py"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? resolve(process.cwd(), "system/python/webmail_manager.py");
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

export async function runDovecotManager<T = Record<string, unknown>>(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const scriptPath = getDovecotManagerScriptPath();
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
      rej(new MailError(`Failed to spawn dovecot_manager: ${err.message}`, "SPAWN_ERROR", 500));
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        rej(new MailError(`dovecot_manager failed (code ${code}): ${stderr}`, "PROCESS_ERROR", 500));
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

async function runWebmailManager<T = Record<string, unknown>>(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const scriptPath = getWebmailManagerScriptPath();
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
      rej(new MailError(`Failed to spawn webmail_manager: ${err.message}`, "SPAWN_ERROR", 500));
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        rej(new MailError(`webmail_manager failed (code ${code}): ${stderr}`, "PROCESS_ERROR", 500));
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
  private readonly dnsService: DnsService;

  constructor(private readonly prisma: PrismaClient) {
    this.dnsService = new DnsService(prisma);
  }

  /**
   * Probes and returns Postfix SMTP + OpenDKIM and Dovecot IMAP service health.
   */
  async getStatus(): Promise<SmtpStatusResponse> {
    const smtpHost = process.env.SMTP_HOST || "127.0.0.1";
    const imapHost = process.env.IMAP_HOST || "127.0.0.1";

    const [smtpResult, imapResult] = await Promise.all([
      runPostfixManager<SmtpStatusResponse>("status", { host: smtpHost }),
      runDovecotManager<ImapStatusResponse>("status", { host: imapHost }).catch(
        () => undefined,
      ),
    ]);

    return { ...smtpResult, imap: imapResult };
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
            OR: [
              { type: "TXT", name: "default._domainkey" },
              { type: "TXT", name: "@" },
              { type: "TXT", name: "_dmarc" },
              { type: "MX", name: "@" },
            ],
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

      const hasDnsTxt = d.dnsRecords.some(
        (r) => r.type === "TXT" && r.name === "default._domainkey",
      );

      const { checks, score, grade } = this.computeAuthChecks(d.dnsRecords);

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
        spfConfigured: checks.spf.pass,
        dmarcConfigured: checks.dmarc.pass,
        mxConfigured: checks.mx.pass,
        deliverabilityScore: score,
        deliverabilityGrade: grade,
        authChecks: checks,
      });
    }

    return result;
  }

  /**
   * Pure, I/O-free computation of the F4.5 internal-only deliverability
   * scorecard from an already-fetched set of DNS records. No external DNS
   * lookups or third-party API calls are made — this only inspects Vexlyx's
   * own DnsRecord rows.
   */
  private computeAuthChecks(
    dnsRecords: Array<{ type: string; name: string; value: string; priority: number | null }>,
  ): {
    checks: { spf: MailAuthCheck; dkim: MailAuthCheck; dmarc: MailAuthCheck; mx: MailAuthCheck };
    score: number;
    grade: MailAuthStatusResponse["grade"];
  } {
    const unquote = (value: string) => value.replace(/^"|"$/g, "").trim();

    const spfRecord = dnsRecords.find(
      (r) => r.type === "TXT" && r.name === "@" && unquote(r.value).startsWith("v=spf1"),
    );
    const dmarcRecord = dnsRecords.find(
      (r) => r.type === "TXT" && r.name === "_dmarc" && unquote(r.value).startsWith("v=DMARC1"),
    );
    const dkimRecord = dnsRecords.find((r) => r.type === "TXT" && r.name === "default._domainkey");
    const mxRecord = dnsRecords.find((r) => r.type === "MX" && r.name === "@");

    const spfValid = !!spfRecord && /^v=spf1(\s+\S+)*\s+[-~?]all$/.test(unquote(spfRecord.value));
    const dmarcValid =
      !!dmarcRecord && /^v=DMARC1;\s*p=(none|quarantine|reject)/.test(unquote(dmarcRecord.value));
    const dkimPublished = !!dkimRecord;
    const mxPresent = !!mxRecord;

    const checks = {
      spf: {
        pass: spfValid,
        detail: spfRecord ? unquote(spfRecord.value) : "No SPF TXT record found at @",
      },
      dkim: {
        pass: dkimPublished,
        detail: dkimPublished
          ? "default._domainkey TXT record present"
          : "DKIM not published to DNS",
      },
      dmarc: {
        pass: dmarcValid,
        detail: dmarcRecord ? unquote(dmarcRecord.value) : "No DMARC TXT record found at _dmarc",
      },
      mx: {
        pass: mxPresent,
        detail: mxRecord ? `${mxRecord.value} (priority ${mxRecord.priority})` : "No MX record found",
      },
    };

    const score =
      (checks.spf.pass ? 25 : 0) +
      (checks.dkim.pass ? 25 : 0) +
      (checks.dmarc.pass ? 25 : 0) +
      (checks.mx.pass ? 25 : 0);

    const grade: MailAuthStatusResponse["grade"] =
      score === 100 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs Improvement" : "Poor";

    return { checks, score, grade };
  }

  /**
   * Computes the F4.5 deliverability scorecard for a single domain.
   */
  async getMailAuthStatus(userId: string, domainId: string): Promise<MailAuthStatusResponse> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, userId },
      include: { dnsRecords: true },
    });

    if (!domain) {
      throw new MailError("Domain not found or unauthorized", "DOMAIN_NOT_FOUND", 404);
    }

    const { checks, score, grade } = this.computeAuthChecks(domain.dnsRecords);

    return {
      domainId: domain.id,
      hostname: domain.hostname,
      spfConfigured: checks.spf.pass,
      dkimConfigured: checks.dkim.pass,
      dmarcConfigured: checks.dmarc.pass,
      mxConfigured: checks.mx.pass,
      score,
      grade,
      checks,
    };
  }

  /**
   * Idempotently provisions SPF, DKIM, DMARC, and MX records for a domain
   * (F4.5). Safe to call repeatedly — record creation is check-then-create,
   * never destructive.
   */
  async ensureEmailAuthRecords(userId: string, domainId: string): Promise<MailAuthStatusResponse> {
    await this.dnsService.initializeEmailAuthRecords(userId, domainId);
    await this.getOrGenerateDkim(userId, domainId, true);
    return this.getMailAuthStatus(userId, domainId);
  }

  /**
   * Synchronizes active domains from the database to Postfix's virtual domains
   * map, and their Mailbox rows into Dovecot's passwd-file (passdb + userdb)
   * so IMAP logins and Maildir++ quota rules stay current (F4.2).
   */
  async syncVirtualDomains(
    userId: string,
  ): Promise<{ success: boolean; syncedCount: number; domains: string[]; mailboxesSynced: number }> {
    const domains = await this.prisma.domain.findMany({
      where: { userId },
      select: {
        hostname: true,
        mailboxes: { select: { address: true, password: true, quota: true } },
      },
    });

    const hostnames = domains.map((d) => d.hostname);
    const mailboxes = domains.flatMap((d) =>
      d.mailboxes.map((m) => ({
        address: m.address,
        passwordHash: m.password,
        quotaMb: m.quota,
      })),
    );

    const [syncRes, dovecotRes] = await Promise.all([
      runPostfixManager<{ success: boolean; syncedCount: number; domains: string[] }>(
        "sync_virtual_domains",
        { domains: hostnames, mailboxes: mailboxes.map((m) => m.address) },
      ),
      runDovecotManager<{ success: boolean; syncedCount: number }>("sync_mailboxes", {
        domains: hostnames,
        mailboxes,
      }).catch(() => ({ success: false, syncedCount: 0 })),
    ]);

    return { ...syncRes, mailboxesSynced: dovecotRes.syncedCount };
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
      // Sync CoreDNS zone file so the new TXT record is actually resolvable,
      // not just persisted in Postgres (F4.5).
      await this.dnsService.syncZoneFile(domain.hostname, domain.id);
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

  /**
   * Probes the Roundcube webmail container's reachability and running state.
   */
  async getWebmailStatus(): Promise<WebmailStatusResponse> {
    const host = process.env.WEBMAIL_HOST || "127.0.0.1";
    const result = await runWebmailManager<WebmailStatusResponse>("status", {
      host,
      port: env.WEBMAIL_PORT,
      url: env.WEBMAIL_URL,
    });
    return result;
  }
}
