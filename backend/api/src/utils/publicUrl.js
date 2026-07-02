export function publicUrl(path) {
  const value = String(path || "");
  const configuredBase = process.env.API_PUBLIC_URL || "";
  const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
    configuredBase
  );

  if (!configuredBase || isLocalBase) {
    return value.startsWith("/") ? value : `/${value}`;
  }

  return `${configuredBase.replace(/\/$/, "")}${
    value.startsWith("/") ? value : `/${value}`
  }`;
}

