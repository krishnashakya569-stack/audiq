import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

type HasAvatarPath = { avatar_path: string | null };

export async function withSignedAvatarUrls<T extends HasAvatarPath>(
  supabase: SupabaseClient,
  profiles: T[]
): Promise<Array<T & { avatar_url: string | null }>> {
  const paths = Array.from(
    new Set(profiles.flatMap((profile) => profile.avatar_path ? [profile.avatar_path] : []))
  );

  if (paths.length === 0) {
    return profiles.map((profile) => ({ ...profile, avatar_url: null }));
  }

  const { data, error } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const urlsByPath = new Map(
    error ? [] : (data ?? []).map((item) => [item.path, item.signedUrl] as const)
  );

  return profiles.map((profile) => ({
    ...profile,
    avatar_url: profile.avatar_path ? urlsByPath.get(profile.avatar_path) ?? null : null,
  }));
}

