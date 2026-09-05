"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Lock,
  RefreshCw,
  Send,
  Copy,
  Check,
  Search,
  Key,
  Globe,
  Terminal,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMail } from "@/hooks/useMail";
import { cn } from "@/lib/utils";
import type { SendTestEmailInput, TestEmailResultResponse } from "@vexlyx/shared";

export default function MailPage() {
  const {
    status,
    domains,
    isLoading,
    isRefreshing,
    refreshAll,
    syncDomains,
    generateDkim,
    sendTestEmail,
    testOpenRelay,
  } = useMail();

  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [generatingDkimId, setGeneratingDkimId] = useState<string | null>(null);

  // Test Email Modal state
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<TestEmailResultResponse | null>(null);
  const [testForm, setTestForm] = useState<SendTestEmailInput>({
    from: "admin@vexlyx.local",
    to: "test@example.com",
    subject: "Vexlyx Postfix SMTP Diagnostic Test",
    body: "This is a verified test email sent via Vexlyx Postfix SMTP (F4.1) verifying TLS encryption and relay rules.",
    port: 587,
    useTls: true,
  });

  // Relay Test Modal state
  const [isRelayTestOpen, setIsRelayTestOpen] = useState(false);
  const [isTestingRelay, setIsTestingRelay] = useState(false);
  const [relayResult, setRelayResult] = useState<{
    safe: boolean;
    relayDenied: boolean;
    rcptResponse: string;
    transcript: string[];
  } | null>(null);

  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return domains;
    const q = searchQuery.toLowerCase();
    return domains.filter((d) => d.hostname.toLowerCase().includes(q));
  }, [domains, searchQuery]);

  const copyToClipboard = (text: string, fieldKey: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSyncDomains = async () => {
    setIsSyncing(true);
    try {
      const res = await syncDomains();
      toast.success(`Synchronized ${res.syncedCount} virtual domains with Postfix`);
    } catch {
      toast.error("Failed to sync virtual domains");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateDkim = async (domainId: string) => {
    setGeneratingDkimId(domainId);
    try {
      const res = await generateDkim(domainId);
      toast.success(`Generated 2048-bit DKIM key for ${res.domain}`);
      if (res.inDns) {
        toast.info("Auto-created TXT record in Vexlyx CoreDNS");
      }
    } catch {
      toast.error("Failed to generate DKIM key");
    } finally {
      setGeneratingDkimId(null);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendTestEmail(testForm);
      setTestResult(res);
      if (res.success) {
        toast.success("Test email delivered successfully!");
      } else {
        toast.error(`SMTP delivery failed: ${res.error || "Unknown error"}`);
      }
    } catch {
      toast.error("Failed to connect to SMTP server");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRunRelayTest = async () => {
    setIsRelayTestOpen(true);
    setIsTestingRelay(true);
    setRelayResult(null);

    try {
      const res = await testOpenRelay();
      setRelayResult(res);
      if (res.safe && res.relayDenied) {
        toast.success("Relay test passed: Open relay is strictly blocked!");
      } else {
        toast.error("Warning: Server may be accepting open relay!");
      }
    } catch {
      toast.error("Relay test probe failed");
    } finally {
      setIsTestingRelay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mail & Outgoing SMTP
            </h1>
            <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-500">
              F4.1 Postfix MTA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your outgoing mail server, virtual domains, OpenDKIM signing, and relay security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing || isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunRelayTest}
            className="gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <ShieldCheck className="h-4 w-4" />
            Test Anti-Relay
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setTestResult(null);
              setIsTestEmailOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Send Test Email
          </Button>
        </div>
      </div>

      <Separator />

      {/* Status & Service Health Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* MTA Daemon Status */}
        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MTA Service Status
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                        status?.status === "active" ? "bg-emerald-400" : "bg-rose-400",
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex h-2.5 w-2.5 rounded-full",
                        status?.status === "active" ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    />
                  </span>
                  <span className="text-lg font-bold capitalize text-foreground">
                    {status?.status ?? "Unknown"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Postfix daemon listening
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Port 25 SMTP */}
        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Port 25 (SMTP Server)
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      status?.port25Open
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-slate-500/20 bg-slate-500/10 text-slate-500",
                    )}
                  >
                    {status?.port25Open ? "Port 25 Open" : "Port 25 Closed"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Server-to-server MTA transport
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Port 587 Submission */}
        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Port 587 (Submission)
            </CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      status?.port587Open
                        ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-slate-500/20 bg-slate-500/10 text-slate-500",
                    )}
                  >
                    {status?.port587Open ? "Port 587 Open" : "Port 587 Closed"}
                  </Badge>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    TLS Required
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  RFC 6409 client submission
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OpenDKIM & Security */}
        <Card className="border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DKIM & Anti-Relay
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    Open Relay Protected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Milter: {status?.openDkimConnected ? "OpenDKIM Active" : "Standby"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Virtual Domains & DKIM Configuration Accordion Card */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Virtual Domains & DKIM Signatures
              </CardTitle>
              <CardDescription>
                Domains routed through Postfix for outgoing email and signed cryptographically with OpenDKIM.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncDomains}
                disabled={isSyncing}
                className="gap-2"
              >
                <Zap className={cn("h-4 w-4 text-indigo-500", isSyncing && "animate-spin")} />
                Sync with Postfix
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter domains by hostname…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No Virtual Domains Configured
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a custom domain under Domains to enable Postfix routing and DKIM signing.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/domains">Manage Domains</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDomains.map((domain) => {
                const isExpanded = expandedDomainId === domain.domainId;
                const dkim = domain.dkimRecord;

                return (
                  <div
                    key={domain.domainId}
                    className="overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 hover:border-border/80"
                  >
                    {/* Domain Header Row */}
                    <div
                      onClick={() => setExpandedDomainId(isExpanded ? null : domain.domainId)}
                      className="flex cursor-pointer items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {domain.hostname}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                domain.status === "ACTIVE"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {domain.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {domain.mailboxCount} Mailbox{domain.mailboxCount === 1 ? "" : "es"} configured
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {domain.dkimEnabled ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          >
                            <Key className="mr-1 h-3 w-3" />
                            DKIM Signed (2048-bit)
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          >
                            DKIM Not Configured
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Accordion Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                        {domain.dkimEnabled && dkim ? (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">
                                  OpenDKIM DNS TXT Record
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Add this TXT record to your DNS zone so recipient mail servers verify incoming mail signatures.
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {dkim.inDns ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Active in Vexlyx DNS
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateDkim(domain.domainId)}
                                    disabled={generatingDkimId === domain.domainId}
                                  >
                                    Auto-Add to DNS
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Record Fields */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              {/* Host / Name */}
                              <div className="rounded-md border border-border bg-card p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Record Name / Host (TXT)
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      copyToClipboard(dkim.dnsRecordName, `name-${domain.domainId}`)
                                    }
                                  >
                                    {copiedField === `name-${domain.domainId}` ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                                <code className="mt-1 block font-mono text-xs text-foreground">
                                  {dkim.dnsRecordName}
                                </code>
                              </div>

                              {/* Selector */}
                              <div className="rounded-md border border-border bg-card p-3">
                                <span className="text-xs font-medium text-muted-foreground">
                                  DKIM Selector
                                </span>
                                <code className="mt-1 block font-mono text-xs text-foreground">
                                  {dkim.selector} (RSA 2048-bit)
                                </code>
                              </div>
                            </div>

                            {/* Record Value */}
                            <div className="rounded-md border border-border bg-card p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Record Value (v=DKIM1; k=rsa; p=...)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    copyToClipboard(dkim.dnsRecordValue, `val-${domain.domainId}`)
                                  }
                                >
                                  {copiedField === `val-${domain.domainId}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                              <div className="mt-1 max-h-24 overflow-y-auto rounded bg-slate-950 p-2 text-xs font-mono text-slate-100">
                                {dkim.dnsRecordValue}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Key className="h-8 w-8 text-amber-500/60" />
                            <h4 className="mt-2 text-sm font-semibold text-foreground">
                              DKIM Keys Not Yet Generated
                            </h4>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                              Generate a 2048-bit RSA key pair for {domain.hostname} to ensure outgoing emails are cryptographically signed and pass DMARC/SPF checks.
                            </p>
                            <Button
                              size="sm"
                              className="mt-3 gap-2"
                              onClick={() => handleGenerateDkim(domain.domainId)}
                              disabled={generatingDkimId === domain.domainId}
                            >
                              <Zap className="h-3.5 w-3.5" />
                              {generatingDkimId === domain.domainId
                                ? "Generating Keys…"
                                : "Generate DKIM Key Pair"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Test Email Modal */}
      <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-500" />
              SMTP Diagnostic Delivery Sandbox
            </DialogTitle>
            <DialogDescription>
              Deliver a live test message through the Postfix SMTP server to verify STARTTLS handshake, submission authentication, and relay restrictions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendTestEmail} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="from">From Email Address</Label>
                <Input
                  id="from"
                  type="email"
                  required
                  value={testForm.from}
                  onChange={(e) => setTestForm({ ...testForm, from: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="to">Recipient Email Address</Label>
                <Input
                  id="to"
                  type="email"
                  required
                  value={testForm.to}
                  onChange={(e) => setTestForm({ ...testForm, to: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="port">Submission Port</Label>
                <Select
                  value={String(testForm.port)}
                  onValueChange={(val) => setTestForm({ ...testForm, port: Number(val) as 25 | 587 })}
                >
                  <SelectTrigger id="port">
                    <SelectValue placeholder="Select port" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="587">Port 587 (Submission / Mandatory TLS)</SelectItem>
                    <SelectItem value="25">Port 25 (Standard SMTP MTA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  required
                  value={testForm.subject}
                  onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Message Body</Label>
              <Textarea
                id="body"
                rows={2}
                value={testForm.body}
                onChange={(e) => setTestForm({ ...testForm, body: e.target.value })}
              />
            </div>

            {/* Live SMTP Transcript Output */}
            {testResult && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Terminal className="h-3.5 w-3.5" />
                    SMTP Session Transcript:
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      testResult.success
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {testResult.success ? "250 Delivery Ok" : "Rejected"}
                  </Badge>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                  {testResult.transcript.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        line.startsWith("< 2") && "text-emerald-400",
                        line.startsWith("< 5") && "text-rose-400",
                        line.startsWith(">") && "text-indigo-300 font-semibold",
                      )}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTestEmailOpen(false)}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSendingTest} className="gap-2">
                <Send className={cn("h-4 w-4", isSendingTest && "animate-spin")} />
                {isSendingTest ? "Transmitting…" : "Transmit SMTP Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Anti-Relay Probe Modal */}
      <Dialog open={isRelayTestOpen} onOpenChange={setIsRelayTestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Open Relay Security Probe
            </DialogTitle>
            <DialogDescription>
              Tests RFC 5321 anti-relay enforcement by attempting an unauthenticated delivery from an external domain to a third-party recipient.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isTestingRelay ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Probing Postfix relay restrictions…
                </p>
              </div>
            ) : relayResult ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-4",
                    relayResult.safe && relayResult.relayDenied
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
                  )}
                >
                  {relayResult.safe && relayResult.relayDenied ? (
                    <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="h-8 w-8 shrink-0 text-rose-500" />
                  )}
                  <div>
                    <h4 className="font-semibold">
                      {relayResult.safe && relayResult.relayDenied
                        ? "Server is NOT an Open Relay (Secure)"
                        : "Open Relay Vulnerability Detected!"}
                    </h4>
                    <p className="text-xs">
                      Response: {relayResult.rcptResponse}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                  {relayResult.transcript.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        line.startsWith("< 5") && "text-rose-400",
                        line.startsWith(">") && "text-indigo-300",
                      )}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRelayTestOpen(false)}>
              Close
            </Button>
            <Button onClick={handleRunRelayTest} disabled={isTestingRelay}>
              Re-run Probe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
