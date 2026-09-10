import type { DnsOnboardingInfoResponse, DnsRecordSuggestion } from "@vexlyx/shared";
import { env } from "../../config/env.js";

export class SystemService {
  // Builds the DNS/IP reference info an admin needs to point their domain(s)
  // at this server (F5.9). Returns an empty record list — rather than
  // guessing — whenever the domain or public IP isn't known, since a
  // half-correct record list is worse than none.
  getDnsOnboardingInfo(): DnsOnboardingInfoResponse {
    const domain = env.PANEL_DOMAIN ?? null;
    const publicIp = env.PUBLIC_IP ?? null;
    const baseDomain = env.BASE_DOMAIN;

    const records: DnsRecordSuggestion[] = [];
    if (domain && publicIp) {
      records.push({ type: "A", host: domain, value: publicIp, purpose: "Panel" });
      records.push({ type: "A", host: `webmail.${domain}`, value: publicIp, purpose: "Webmail" });
      records.push({
        type: "A",
        host: `*.${baseDomain}`,
        value: publicIp,
        purpose: "Deployed project subdomains",
      });
    }

    return { publicIp, domain, baseDomain, records };
  }
}
