"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, UserPlus, Users, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePlaylistStore, type Playlist } from "@/store/playlist";

type Props = { playlist: Playlist };
type Member = {
  playlist_id: string;
  owner_id: string;
  user_id: string;
  role: "editor" | "viewer";
  status: "pending" | "accepted";
};
type Friend = { id: string; display_name: string; handle: string; audiq_id: string };

function updateLocalRole(playlistId: string, ownerId: string, role: Playlist["collaborationRole"]) {
  usePlaylistStore.setState((state) => ({
    playlists: state.playlists.map((playlist) => playlist.id === playlistId
      ? { ...playlist, ownerId, collaborationRole: role }
      : playlist),
  }));
}

function removeLocalPlaylist(playlistId: string) {
  usePlaylistStore.setState((state) => ({
    playlists: state.playlists.filter((playlist) => playlist.id !== playlistId),
  }));
}

export default function PlaylistCollaborationPanel({ playlist }: Props) {
  const { user, supabase } = useAuth();
  const ownerId = playlist.ownerId ?? user?.id ?? "";
  const isOwner = Boolean(user && (playlist.collaborationRole === "owner" || ownerId === user.id));
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendNames, setFriendNames] = useState<Record<string, Friend>>({});
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase || !user || !playlist.id) return;
    const { data: memberRows, error: memberError } = await supabase
      .from("audiq_playlist_members")
      .select("playlist_id,owner_id,user_id,role,status")
      .eq("playlist_id", playlist.id);
    if (memberError) {
      setError("Could not load playlist collaborators. Apply the collaboration database migration and try again.");
      return;
    }
    const visibleMembers = (memberRows ?? []) as Member[];
    setMembers(visibleMembers);
    const friendIds = new Set<string>();
    if (isOwner) {
      const { data: friendships, error: friendsError } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (friendsError) {
        setError("Could not load your friends to invite.");
      } else {
        for (const friendship of friendships ?? []) {
          const otherId = friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id;
          if (!visibleMembers.some((member) => member.user_id === otherId)) friendIds.add(otherId);
        }
      }
    }
    const profileIds = [...new Set([
      ...visibleMembers.map((member) => member.user_id),
      ...(isOwner ? [...friendIds] : []),
    ])];
    if (profileIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,display_name,handle,audiq_id")
        .in("id", profileIds);
      const profiles = (profileRows ?? []) as Friend[];
      setFriendNames(Object.fromEntries(profiles.map((profile) => [profile.id, profile])));
      const availableFriends = profiles.filter((profile) => friendIds.has(profile.id));
      setFriends(availableFriends);
      setSelectedFriendId((current) => availableFriends.some((friend) => friend.id === current)
        ? current
        : availableFriends[0]?.id ?? "");
    } else {
      setFriendNames({});
      setFriends([]);
      setSelectedFriendId("");
    }
  }, [isOwner, playlist.id, supabase, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ownInvitation = useMemo(
    () => user ? members.find((member) => member.user_id === user.id && member.status === "pending") : undefined,
    [members, user]
  );

  async function runMembershipChange(action: "accept" | "decline" | "leave") {
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    setNotice("");
    let changeError: string | null = null;
    if (action === "accept") {
      const { data, error: updateError } = await supabase.from("audiq_playlist_members").update({ status: "accepted" })
        .eq("playlist_id", playlist.id).eq("owner_id", ownerId).eq("user_id", user.id).eq("status", "pending")
        .select("playlist_id").maybeSingle();
      changeError = updateError?.message ?? (data ? null : "Invite no longer exists");
    } else {
      const { data, error: deleteError } = await supabase.from("audiq_playlist_members").delete()
        .eq("playlist_id", playlist.id).eq("owner_id", ownerId).eq("user_id", user.id)
        .select("playlist_id").maybeSingle();
      changeError = deleteError?.message ?? (data ? null : "Membership no longer exists");
    }
    setBusy(false);
    if (changeError) {
      setError(action === "accept" ? "Could not accept this invite." : "Could not leave this playlist.");
      return;
    }
    if (action === "accept") {
      updateLocalRole(playlist.id, ownerId, ownInvitation?.role ?? "editor");
      setNotice("You joined the collaborative playlist. New edits sync for everyone.");
      await refresh();
    } else {
      removeLocalPlaylist(playlist.id);
      setNotice(action === "decline" ? "Invite declined." : "You left the playlist.");
    }
  }

  async function inviteFriend() {
    if (!supabase || !user || !selectedFriendId) return;
    setBusy(true);
    setError("");
    setNotice("");
    const { error: inviteError } = await supabase.from("audiq_playlist_members").insert({
      playlist_id: playlist.id,
      owner_id: ownerId,
      user_id: selectedFriendId,
      invited_by: user.id,
      role: inviteRole,
      status: "pending",
    });
    setBusy(false);
    if (inviteError) {
      setError("Could not send the invite. Check that you are still friends and the person is not already invited.");
      return;
    }
    setNotice(`Invite sent to ${friendNames[selectedFriendId]?.display_name ?? "your friend"}.`);
    await refresh();
  }

  async function updateRole(member: Member, role: "editor" | "viewer") {
    if (!supabase || !user || !isOwner) return;
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.from("audiq_playlist_members").update({ role })
      .eq("playlist_id", playlist.id).eq("owner_id", ownerId).eq("user_id", member.user_id);
    setBusy(false);
    if (updateError) setError("Could not update this collaborator's role.");
    else await refresh();
  }

  async function removeMember(member: Member) {
    if (!supabase || !user || !isOwner) return;
    setBusy(true);
    setError("");
    const { error: removeError } = await supabase.from("audiq_playlist_members").delete()
      .eq("playlist_id", playlist.id).eq("owner_id", ownerId).eq("user_id", member.user_id);
    setBusy(false);
    if (removeError) setError("Could not remove this collaborator.");
    else await refresh();
  }

  if (!user || !supabase) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-400">
        Sign in to invite friends and collaborate on playlists.
      </section>
    );
  }

  if (playlist.collaborationRole === "pending" && ownInvitation) {
    return (
      <section className="rounded-xl border border-[#00796b]/35 bg-[#00796b]/10 p-4">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#80cbc4]" />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white">Playlist invite</h3>
            <p className="mt-1 text-sm text-zinc-400">You were invited as a {ownInvitation.role}. Accept to open the track list and start listening.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void runMembershipChange("accept")} className="inline-flex items-center gap-2 rounded-lg bg-[#00796b] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept invite
              </button>
              <button type="button" disabled={busy} onClick={() => void runMembershipChange("decline")} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50">
                <X className="h-4 w-4" /> Decline
              </button>
            </div>
          </div>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#80cbc4]" />
          <div>
            <h3 className="font-bold text-white">Collaborative playlist</h3>
            <p className="mt-1 text-sm text-zinc-400">You have {playlist.collaborationRole} access. Tracks update for every member.</p>
          </div>
        </div>
        <button type="button" disabled={busy} onClick={() => void runMembershipChange("leave")} className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50">
          Leave playlist
        </button>
        {error ? <p role="alert" className="w-full text-sm text-red-300">{error}</p> : null}
        {notice ? <p role="status" className="w-full text-sm text-[#80cbc4]">{notice}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#80cbc4]" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white">Collaborate on this playlist</h3>
          <p className="mt-1 text-sm text-zinc-400">Invite an accepted friend to edit tracks together or give them listen-only access.</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Members</p>
        {members.length ? members.map((member) => {
          const friend = friendNames[member.user_id];
          return (
            <div key={member.user_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{friend?.display_name ?? friend?.handle ?? "Audiq listener"}</span>
              <span className="text-xs text-zinc-500">{member.status === "pending" ? "Invite pending" : "Joined"}</span>
              <select aria-label={`Role for ${friend?.display_name ?? "member"}`} disabled={busy || member.status === "pending"} value={member.role} onChange={(event) => void updateRole(member, event.target.value as "editor" | "viewer")} className="rounded-md border border-white/10 bg-[#101412] px-2 py-1 text-xs text-zinc-200 disabled:opacity-50">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" disabled={busy} onClick={() => void removeMember(member)} className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" aria-label={`Remove ${friend?.display_name ?? "member"}`} title="Revoke invite or access">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        }) : <p className="text-sm text-zinc-500">This playlist is private until you invite someone.</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select aria-label="Choose a friend to invite" value={selectedFriendId} onChange={(event) => setSelectedFriendId(event.target.value)} disabled={!friends.length || busy} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101412] px-3 py-2 text-sm text-white disabled:opacity-50">
          {friends.length ? friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.display_name} · @{friend.handle}</option>) : <option value="">No eligible friends to invite</option>}
        </select>
        <select aria-label="Choose collaborator role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")} disabled={busy} className="rounded-lg border border-white/10 bg-[#101412] px-3 py-2 text-sm text-white disabled:opacity-50">
          <option value="editor">Can edit</option>
          <option value="viewer">Can listen</option>
        </select>
        <button type="button" disabled={!selectedFriendId || busy} onClick={() => void inviteFriend()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#00796b] px-3 py-2 text-sm font-bold text-white hover:bg-[#00695c] disabled:opacity-45">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Invite
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-[#80cbc4]">{notice}</p> : null}
    </section>
  );
}
