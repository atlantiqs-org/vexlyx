-- CreateTable
CREATE TABLE "vacation_responders" (
    "id" TEXT NOT NULL,
    "mailbox_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL DEFAULT 'Out of office: Auto-reply',
    "message" TEXT NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_responders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vacation_responders_mailbox_id_key" ON "vacation_responders"("mailbox_id");

-- AddForeignKey
ALTER TABLE "vacation_responders" ADD CONSTRAINT "vacation_responders_mailbox_id_fkey" FOREIGN KEY ("mailbox_id") REFERENCES "mailboxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
