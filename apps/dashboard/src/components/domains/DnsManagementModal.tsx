"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Server,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit2,
  Download,
  Upload,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  FileCode,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { useDnsRecords } from "@/hooks/useDnsRecords";
import { cn } from "@/lib/utils";
import { refreshIconClassName } from "@/hooks/useRefreshAnimation";
import type {
  DomainResponse,
  DnsRecordResponse,
  DnsRecordType,
  DnsPropagationResponse,
} from "@vexlyx/shared";

// ---------------------------------------------------------------------------
// Type badge configurations
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  DnsRecordType,
  { label: string; className: string; placeholder: string; helper: string }
> = {
  A: {
    label: "A",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    placeholder: "192.0.2.1",
    helper: "IPv4 address target",
  },
  AAAA: {
    label: "AAAA",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    placeholder: "2001:db8::1",
    helper: "IPv6 address target",
  },
  CNAME: {
    label: "CNAME",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    placeholder: "target.example.com",
    helper: "Canonical domain name alias (cannot be apex @)",
  },
  MX: {
    label: "MX",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    placeholder: "mail.example.com",
    helper: "Mail exchange server hostname",
  },
  TXT: {
    label: "TXT",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    placeholder: "v=spf1 include:_spf.example.com ~all",
    helper: "Arbitrary text, SPF, DKIM, or verification tokens",
  },
  NS: {
    label: "NS",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    placeholder: "ns1.vexlyx.com",
    helper: "Authoritative nameserver for zone delegation",
  },
  SRV: {
    label: "SRV",
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    placeholder: "sipserver.example.com",
    helper: "Service locator target hostname",
  },
};

const TTL_PRESETS = [
  { label: "1 min (60s)", value: 60 },
  { label: "5 min (300s)", value: 300 },
  { label: "30 min (1800s)", value: 1800 },
  { label: "1 hour (3600s)", value: 3600 },
  { label: "1 day (86400s)", value: 86400 },
];

function formatTtl(ttl: number): string {
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.round(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.round(ttl / 3600)}h`;
  return `${Math.round(ttl / 86400)}d`;
}

interface DnsManagementModalProps {
  domain: DomainResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DnsManagementModal({
  domain,
  open,
  onOpenChange,
}: DnsManagementModalProps) {
  const {
    records,
    isLoading,
    isRefreshing,
    refresh,
    createRecord,
    updateRecord,
    deleteRecord,
    initializeDefaults,
    exportZone,
    importZone,
    checkPropagation,
  } = useDnsRecords({
    domainId: domain?.id,
    autoFetch: open && Boolean(domain?.id),
  });

  // Filter & Search states
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Record Form Modal (Add / Edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecordResponse | null>(null);
  const [formType, setFormType] = useState<DnsRecordType>("A");
  const [formName, setFormName] = useState("@");
  const [formValue, setFormValue] = useState("");
  const [formTtl, setFormTtl] = useState(3600);
  const [formPriority, setFormPriority] = useState<number | undefined>(10);
  const [formWeight, setFormWeight] = useState<number | undefined>(10);
  const [formPort, setFormPort] = useState<number | undefined>(5060);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Propagation Modal
  const [propagationModalOpen, setPropagationModalOpen] = useState(false);
  const [propagationResult, setPropagationResult] = useState<DnsPropagationResponse | null>(null);
  const [isCheckingPropagation, setIsCheckingPropagation] = useState(false);

  // Zone Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [zoneText, setZoneText] = useState("");
  const [importStrategy, setImportStrategy] = useState<"skip" | "replace">("skip");
  const [isImporting, setIsImporting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DnsRecordResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedType !== "ALL" && r.type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.value.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, selectedType, searchQuery]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormType("A");
    setFormName("@");
    setFormValue("");
    setFormTtl(3600);
    setFormPriority(10);
    setFormWeight(10);
    setFormPort(5060);
    setFormOpen(true);
  };

  const openEditModal = (rec: DnsRecordResponse) => {
    setEditingRecord(rec);
    setFormType(rec.type);
    setFormName(rec.name);
    setFormValue(rec.value);
    setFormTtl(rec.ttl);
    setFormPriority(rec.priority ?? 10);
    setFormWeight(rec.weight ?? 10);
    setFormPort(rec.port ?? 5060);
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim()) {
      toast.error("Please enter a record value");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await updateRecord(editingRecord.id, {
          name: formName.trim(),
          value: formValue.trim(),
          ttl: formTtl,
          priority: formType === "MX" || formType === "SRV" ? formPriority : null,
          weight: formType === "SRV" ? formWeight : null,
          port: formType === "SRV" ? formPort : null,
        });
        toast.success(`Updated ${formType} record for ${formName}`);
      } else {
        await createRecord({
          type: formType,
          name: formName.trim(),
          value: formValue.trim(),
          ttl: formTtl,
          priority: formType === "MX" || formType === "SRV" ? formPriority : null,
          weight: formType === "SRV" ? formWeight : null,
          port: formType === "SRV" ? formPort : null,
        });
        toast.success(`Added ${formType} record for ${formName}`);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save DNS record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteRecord(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.type} record "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInitDefaults = async () => {
    try {
      await initializeDefaults();
      toast.success("Recommended DNS records configured (Apex A, www CNAME, ns1/ns2 NS)");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize default records");
    }
  };

  const handleExportZone = async () => {
    try {
      const content = await exportZone();
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${domain?.hostname || "zone"}.zone`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Zone file downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export zone file");
    }
  };

  const handleImportSubmit = async () => {
    if (!zoneText.trim()) {
      toast.error("Please paste zone file content");
      return;
    }
    setIsImporting(true);
    try {
      const res = await importZone(zoneText, importStrategy);
      toast.success(`Successfully imported ${res.importedCount} DNS records`);
      if (res.errors.length > 0) {
        toast.warning(`${res.errors.length} non-critical lines skipped`);
      }
      setZoneText("");
      setImportModalOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import zone file");
    } finally {
      setIsImporting(false);
    }
  };

  const handleTestPropagation = async (rec: DnsRecordResponse) => {
    setIsCheckingPropagation(true);
    setPropagationModalOpen(true);
    setPropagationResult(null);
    try {
      const res = await checkPropagation(rec.id);
      setPropagationResult(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Propagation test failed");
    } finally {
      setIsCheckingPropagation(false);
    }
  };

  if (!domain) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          {/* Header */}
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-indigo-500" />
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    DNS Zone Management
                  </DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    {domain.hostname}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    CoreDNS Zone
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Authoritative RFC 1035 zone file management, live propagation testing, and record delegation.
                </DialogDescription>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={isRefreshing || isLoading}
                  className="h-8 px-2.5 text-xs gap-1.5"
                  title="Refresh records"
                >
                  <RefreshCw className={refreshIconClassName(isRefreshing, "h-3.5 w-3.5")} />
                  Refresh
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportZone}
                  className="h-8 px-2.5 text-xs gap-1.5"
                  title="Download RFC 1035 zone file"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportModalOpen(true)}
                  className="h-8 px-2.5 text-xs gap-1.5"
                  title="Import zone file"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>

                <Button
                  size="sm"
                  onClick={openCreateModal}
                  className="h-8 px-3 text-xs gap-1.5 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Record
                </Button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {["ALL", "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"].map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      type="button"
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                      )}
                    >
                      {type}
                      {type !== "ALL" && (
                        <span className="ml-1 text-[10px] opacity-70">
                          ({records.filter((r) => r.type === type).length})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search records..."
                  className="h-8 pl-8 text-xs bg-card"
                />
              </div>
            </div>
          </DialogHeader>

          {/* Records Table / List */}
          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center flex flex-col items-center justify-center my-4">
                <FileCode className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
                <h4 className="text-sm font-semibold text-foreground">No DNS records in zone</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                  This domain currently has no DNS records configured on Vexlyx CoreDNS nameservers.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleInitDefaults} className="h-8 text-xs gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Setup Recommended Records
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openCreateModal}
                    className="h-8 text-xs"
                  >
                    Add Custom Record
                  </Button>
                </div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No records matching filter &ldquo;{selectedType}&rdquo; or query &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                      <th className="py-2.5 px-3 w-20">Type</th>
                      <th className="py-2.5 px-3 w-40">Name</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3 w-24">TTL</th>
                      <th className="py-2.5 px-3 w-36 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.map((record) => {
                      const cfg = TYPE_CONFIG[record.type] ?? TYPE_CONFIG.A;
                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {/* Type */}
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-mono font-semibold px-2 py-0.5", cfg.className)}
                            >
                              {record.type}
                            </Badge>
                          </td>

                          {/* Name */}
                          <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                            {record.name}
                            {record.name !== "@" && (
                              <span className="text-muted-foreground font-normal text-[10px]">
                                .{domain.hostname}
                              </span>
                            )}
                          </td>

                          {/* Value */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 max-w-md">
                              <span className="font-mono truncate text-foreground text-[11px]" title={record.value}>
                                {record.value}
                              </span>
                              {(record.type === "MX" || record.type === "SRV") && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono shrink-0">
                                  pri:{record.priority}
                                  {record.port ? ` port:${record.port}` : ""}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* TTL */}
                          <td className="py-2.5 px-3 text-muted-foreground font-mono">
                            {formatTtl(record.ttl)}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleTestPropagation(record)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Test live DNS propagation"
                              >
                                <Activity className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(record)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit record"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(record)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Total Records:</span>
              <span className="font-semibold text-foreground font-mono">{records.length}</span>
              <span className="mx-1.5 opacity-40">|</span>
              <span>Nameservers:</span>
              <span className="font-mono text-[11px] text-foreground">ns1.vexlyx.com, ns2.vexlyx.com</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Add / Edit Record Dialog */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingRecord ? `Edit ${formType} Record` : `Add DNS Record`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure zone record details for {domain.hostname}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Record Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Record Type</Label>
              <Select
                value={formType}
                onValueChange={(val) => setFormType(val as DnsRecordType)}
                disabled={Boolean(editingRecord)}
              >
                <SelectTrigger className="h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"] as DnsRecordType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs font-mono">
                      <span className="font-bold mr-2">{t}</span>
                      <span className="text-muted-foreground text-[11px]">
                        ({TYPE_CONFIG[t]?.helper})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Name (Host)</Label>
                <span className="text-[11px] text-muted-foreground">Use @ for apex root</span>
              </div>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="@, www, mail, or _sip._tcp"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            {/* Value */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Value (Target / Content)</Label>
              {formType === "TXT" ? (
                <Textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={TYPE_CONFIG[formType]?.placeholder}
                  className="min-h-[80px] text-xs font-mono"
                  required
                />
              ) : (
                <Input
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={TYPE_CONFIG[formType]?.placeholder}
                  className="h-9 text-xs font-mono"
                  required
                />
              )}
              <p className="text-[10px] text-muted-foreground">
                {TYPE_CONFIG[formType]?.helper}
              </p>
            </div>

            {/* MX Specific: Priority */}
            {formType === "MX" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Input
                  type="number"
                  min="0"
                  max="65535"
                  value={formPriority ?? 10}
                  onChange={(e) => setFormPriority(parseInt(e.target.value, 10))}
                  placeholder="10"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            )}

            {/* SRV Specific: Priority, Weight, Port */}
            {formType === "SRV" && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Priority</Label>
                  <Input
                    type="number"
                    min="0"
                    max="65535"
                    value={formPriority ?? 10}
                    onChange={(e) => setFormPriority(parseInt(e.target.value, 10))}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Weight</Label>
                  <Input
                    type="number"
                    min="0"
                    max="65535"
                    value={formWeight ?? 10}
                    onChange={(e) => setFormWeight(parseInt(e.target.value, 10))}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Port</Label>
                  <Input
                    type="number"
                    min="1"
                    max="65535"
                    value={formPort ?? 5060}
                    onChange={(e) => setFormPort(parseInt(e.target.value, 10))}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {/* TTL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">TTL (Time to Live)</Label>
              <Select
                value={formTtl.toString()}
                onValueChange={(val) => setFormTtl(parseInt(val, 10))}
              >
                <SelectTrigger className="h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTL_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value.toString()} className="text-xs font-mono">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs font-medium">
                {isSubmitting ? "Saving..." : editingRecord ? "Update Record" : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Propagation Check Dialog */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={propagationModalOpen} onOpenChange={setPropagationModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              <DialogTitle className="text-base font-semibold">DNS Propagation Check</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Querying public resolvers across the internet to verify live resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {isCheckingPropagation ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : propagationResult ? (
              <>
                <div className="rounded-md border border-border p-3 bg-muted/30 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target FQDN:</span>
                    <span className="text-foreground font-semibold">
                      {propagationResult.recordName === "@"
                        ? domain.hostname
                        : `${propagationResult.recordName}.${domain.hostname}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Value:</span>
                    <span className="text-foreground">{propagationResult.expectedValue}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground">Global Status:</span>
                    {propagationResult.isFullyPropagated ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fully Propagated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                        <Clock className="h-3 w-3" /> Propagating / In Progress
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Resolver Results</Label>
                  <div className="space-y-1.5">
                    {propagationResult.resolvers.map((res, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border p-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-foreground">{res.resolver}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {res.detectedValues.length > 0
                              ? res.detectedValues.join(", ")
                              : res.error || "No answer returned"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {res.latencyMs}ms
                          </span>
                          {res.status === "MATCH" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                              Match
                            </Badge>
                          ) : res.status === "MISMATCH" ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0">
                              Mismatch
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPropagationModalOpen(false)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Zone File Import Dialog */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Import RFC 1035 Zone File</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste standard BIND/RFC 1035 zone file content to import records into {domain.hostname}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Zone File Content</Label>
              <Textarea
                value={zoneText}
                onChange={(e) => setZoneText(e.target.value)}
                placeholder={`; Paste zone text here\n$ORIGIN ${domain.hostname}.\n$TTL 3600\n@ IN A 192.0.2.1\nwww IN CNAME @\nmail IN A 192.0.2.2\n@ IN MX 10 mail`}
                className="min-h-[160px] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Conflict Resolution</Label>
              <Select
                value={importStrategy}
                onValueChange={(val) => setImportStrategy(val as "skip" | "replace")}
              >
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip" className="text-xs">
                    Skip existing (merge with existing records)
                  </SelectItem>
                  <SelectItem value="replace" className="text-xs">
                    Replace all (clear zone and import new records)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImportSubmit}
                disabled={isImporting}
                className="h-8 text-xs font-medium"
              >
                {isImporting ? "Importing..." : "Import Zone Records"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Delete Record Confirmation Dialog */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive">
              Delete DNS Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this {deleteTarget?.type} record for &ldquo;{deleteTarget?.name}&rdquo;? Traffic relying on this record will stop resolving.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteRecord}
              disabled={isDeleting}
              className="h-8 text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
