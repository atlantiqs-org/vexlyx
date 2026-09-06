import type { PrismaClient } from "@prisma/client";
import type {
  UpdateVacationResponderInput,
  VacationResponderResponse,
} from "@vexlyx/shared";
import { runDovecotManager } from "../mail/service.js";

export class VacationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "VacationError";
  }
}

const DEFAULT_VACATION_MESSAGE =
  "I am currently away from the office with limited access to email. I will respond to your email as soon as possible upon my return.";

export class VacationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Retrieves the vacation auto-responder configuration for a mailbox.
   * If no responder record exists in the database, returns default inactive configuration.
   */
  async get(userId: string, mailboxId: string): Promise<VacationResponderResponse> {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: mailboxId, userId },
      include: { vacationResponder: true },
    });

    if (!mailbox) {
      throw new VacationError("Mailbox not found or unauthorized", "MAILBOX_NOT_FOUND", 404);
    }

    if (!mailbox.vacationResponder) {
      return {
        id: "",
        mailboxId: mailbox.id,
        enabled: false,
        subject: "Out of office: Auto-reply",
        message: DEFAULT_VACATION_MESSAGE,
        intervalDays: 1,
        startDate: null,
        endDate: null,
        createdAt: mailbox.createdAt.toISOString(),
        updatedAt: mailbox.updatedAt.toISOString(),
      };
    }

    const r = mailbox.vacationResponder;
    return {
      id: r.id,
      mailboxId: r.mailboxId,
      enabled: r.enabled,
      subject: r.subject,
      message: r.message,
      intervalDays: r.intervalDays,
      startDate: r.startDate?.toISOString() ?? null,
      endDate: r.endDate?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Upserts the vacation auto-responder configuration for a mailbox and
   * syncs the generated Dovecot Pigeonhole Sieve script to disk.
   */
  async update(
    userId: string,
    mailboxId: string,
    input: UpdateVacationResponderInput,
  ): Promise<VacationResponderResponse> {
    const mailbox = await this.prisma.mailbox.findFirst({
      where: { id: mailboxId, userId },
    });

    if (!mailbox) {
      throw new VacationError("Mailbox not found or unauthorized", "MAILBOX_NOT_FOUND", 404);
    }

    const startDate = input.startDate ? new Date(input.startDate) : null;
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      throw new VacationError("Start date cannot be after end date", "INVALID_DATE_RANGE", 400);
    }

    const responder = await this.prisma.vacationResponder.upsert({
      where: { mailboxId },
      create: {
        mailboxId,
        enabled: input.enabled,
        subject: input.subject,
        message: input.message,
        intervalDays: input.intervalDays,
        startDate,
        endDate,
      },
      update: {
        enabled: input.enabled,
        subject: input.subject,
        message: input.message,
        intervalDays: input.intervalDays,
        startDate,
        endDate,
      },
    });

    // Synchronize Pigeonhole Sieve script to mailbox home directory.
    // Non-fatal on failure: DB update succeeded, matches alias and domain sync pattern.
    try {
      await runDovecotManager("sync_vacation", {
        address: mailbox.address,
        enabled: responder.enabled,
        subject: responder.subject,
        message: responder.message,
        intervalDays: responder.intervalDays,
        startDate: responder.startDate?.toISOString() ?? null,
        endDate: responder.endDate?.toISOString() ?? null,
      });
    } catch {
      // Dovecot manager sync failed or container is not currently running.
      // Sieve file will be synced on next manual or automatic trigger.
    }

    return {
      id: responder.id,
      mailboxId: responder.mailboxId,
      enabled: responder.enabled,
      subject: responder.subject,
      message: responder.message,
      intervalDays: responder.intervalDays,
      startDate: responder.startDate?.toISOString() ?? null,
      endDate: responder.endDate?.toISOString() ?? null,
      createdAt: responder.createdAt.toISOString(),
      updatedAt: responder.updatedAt.toISOString(),
    };
  }
}
