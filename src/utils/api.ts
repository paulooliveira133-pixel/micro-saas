export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : (input as any).url || String(input);
  
  if (url.startsWith("/api/") && !url.includes("/api/saas/")) {
    const tenantId = (window as any).__tenantId || "imperial";
    const modifiedInit = { ...(init || {}) };
    const headers = new Headers(modifiedInit.headers || {});
    headers.set("x-tenant-id", tenantId);
    modifiedInit.headers = headers;
    return window.fetch(input, modifiedInit);
  }
  
  return window.fetch(input, init);
}
