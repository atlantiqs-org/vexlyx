"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI, ApiRequestError } from "@/lib/api";
import type {
  CertificateResponse,
  ProvisionSslInput,
  UploadCertificateInput,
  UpdateSslSettingsInput,
} from "@vexlyx/shared";

interface UseDomainSslOptions {
  domainId?: string;
  autoFetch?: boolean;
}

export function useDomainSsl({ domainId, autoFetch = true }: UseDomainSslOptions = {}) {
  const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const fetchCertificate = useCallback(
    async (quiet = false) => {
      if (!domainId) {
        setCertificate(null);
        return;
      }

      if (!quiet) setIsLoading(true);
      setError(null);

      try {
        const res = await fetchAPI<{ certificate: CertificateResponse | null }>(
          `/api/domains/${domainId}/ssl`,
        );
        setCertificate(res?.certificate ?? null);
      } catch (err) {
        const message =
          err instanceof ApiRequestError
            ? err.message
            : "Failed to load SSL certificate information";
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [domainId],
  );

  useEffect(() => {
    if (autoFetch && domainId) {
      void fetchCertificate();
    }
  }, [autoFetch, domainId, fetchCertificate]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchCertificate(true);
  };

  const provisionAutoSsl = async (
    input: ProvisionSslInput = { type: "LETS_ENCRYPT", forceHttps: true, autoRenew: true },
  ): Promise<CertificateResponse> => {
    if (!domainId) throw new Error("Domain ID is missing");
    setIsProvisioning(true);
    setError(null);

    try {
      const res = await fetchAPI<{ certificate: CertificateResponse }>(
        `/api/domains/${domainId}/ssl/provision`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      setCertificate(res.certificate);
      return res.certificate;
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to provision SSL certificate";
      setError(message);
      throw err;
    } finally {
      setIsProvisioning(false);
    }
  };

  const uploadCustomCert = async (
    input: UploadCertificateInput,
  ): Promise<CertificateResponse> => {
    if (!domainId) throw new Error("Domain ID is missing");
    setIsUploading(true);
    setError(null);

    try {
      const res = await fetchAPI<{ certificate: CertificateResponse }>(
        `/api/domains/${domainId}/ssl/upload`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      setCertificate(res.certificate);
      return res.certificate;
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to upload custom SSL certificate";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const renewCert = async (): Promise<CertificateResponse> => {
    if (!domainId) throw new Error("Domain ID is missing");
    setIsRenewing(true);
    setError(null);

    try {
      const res = await fetchAPI<{ certificate: CertificateResponse }>(
        `/api/domains/${domainId}/ssl/renew`,
        {
          method: "POST",
        },
      );
      setCertificate(res.certificate);
      return res.certificate;
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to renew certificate";
      setError(message);
      throw err;
    } finally {
      setIsRenewing(false);
    }
  };

  const updateSettings = async (
    input: UpdateSslSettingsInput,
  ): Promise<CertificateResponse> => {
    if (!domainId) throw new Error("Domain ID is missing");
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetchAPI<{ certificate: CertificateResponse }>(
        `/api/domains/${domainId}/ssl/settings`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      );
      setCertificate(res.certificate);
      return res.certificate;
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to update SSL settings";
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const disableSsl = async (): Promise<void> => {
    if (!domainId) throw new Error("Domain ID is missing");
    setIsDisabling(true);
    setError(null);

    try {
      await fetchAPI<{ success: boolean; message: string }>(
        `/api/domains/${domainId}/ssl`,
        {
          method: "DELETE",
        },
      );
      setCertificate(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Failed to disable SSL";
      setError(message);
      throw err;
    } finally {
      setIsDisabling(false);
    }
  };

  return {
    certificate,
    isLoading,
    isRefreshing,
    error,
    isProvisioning,
    isUploading,
    isRenewing,
    isUpdating,
    isDisabling,
    refresh,
    provisionAutoSsl,
    uploadCustomCert,
    renewCert,
    updateSettings,
    disableSsl,
  };
}
