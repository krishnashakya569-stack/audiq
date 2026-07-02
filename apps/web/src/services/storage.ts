const PREFIX = "audiq";

function key(name: string) {
  return `${PREFIX}:${name}`;
}

export function save<T>(name: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      key(name),
      JSON.stringify(value)
    );
  } catch (err) {
    console.error("Storage Save Error", err);
  }
}

export function load<T>(
  name: string,
  defaultValue: T
): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key(name));

    if (!item) {
      return defaultValue;
    }

    return JSON.parse(item) as T;
  } catch (err) {
    console.error("Storage Load Error", err);

    return defaultValue;
  }
}

export function remove(name: string) {
  if (typeof window === "undefined") return;

  localStorage.removeItem(key(name));
}

export function clearAudiqStorage() {
  if (typeof window === "undefined") return;

  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith(`${PREFIX}:`)) {
      localStorage.removeItem(k);
    }
  });
}