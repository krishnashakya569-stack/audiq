# Audiq feature roadmap

Audiq is building a music discovery, playback, library, and social listening experience. “Spotify-style” describes the product category, not a promise to reproduce Spotify’s licensed catalog or proprietary services.

## Present in the source

- Search and discovery from the music providers configured for this deployment, with Home, Explore, trending, mood picks, and taste-seeded recommendations.
- Persistent playback controls, queue editing, shuffle, repeat, sleep timer, autoplay radio, and browser media-session controls.
- Liked songs, personal playlists, recently played history, account-scoped sync for library data and recent searches, and saved music-language preferences.
- Accounts, Audiq IDs, profile photos and generated avatars, settings, friend requests, private chat, chat themes, and password updates.
- Track and playlist snapshot sharing in accepted-friend chats. Shared playlists can be played or saved into the recipient’s library.
- Collaborative playlists with accepted-friend invites, pending-invite acceptance, owner/editor/viewer roles, live updates, and owner-controlled access.
- Owner-controlled public/private playlist pages with read-only public links; private playlists remain available only to their owner and invited collaborators.
- Playlist track sorting by custom order, title, artist, or duration; the chosen order is used for playback without changing the saved playlist sequence.
- Account-synced “not interested” feedback for For You recommendations, with a restore list; ordinary search and playback are unaffected.
- Explore surfaces artist cards from the current mix and real album collections when the catalog provider supplies album metadata; choosing one launches a focused catalog search. For You ranking combines liked-artist affinity and recency with a small novelty demotion for tracks already heard.
- One-to-one listening rooms with private friend-pair authorization and synchronized track, queue, transport, and playback position.

These are source-level features. A production build and end-to-end release check are still required before treating an unreleased change as ready for users.

## Remaining product work

### Library and playlists

- Conflict-aware collaborative playlist reordering and edit history. Track additions/removals currently sync live; simultaneous edits to the same track are last-write-wins.
- Playlist drag-to-reorder and richer track management. The current sort menu is a view and playback order; it does not rewrite the saved custom order.
- Better migration and offline conflict handling across multiple devices.

### Playback and discovery

- Continue improving recommendation relevance with stronger signals and user controls such as mood, genre, and artist preferences.
- Playback continuity work such as gapless transitions and crossfade where the selected provider supports it.
- Dedicated artist and album pages, artist follows, release browsing, and richer library organization. Explore currently provides working artist and album search entry points, not canonical provider-backed detail pages.
- Group listening rooms, room invitations, moderation, and recovery when a participant disconnects.

### Platform and account

- Make player continuity reliable across browser backgrounding and installed Android app lifecycles where the media source permits it.
- Accessibility, playback error reporting, account data export/deletion, and broader product analytics with appropriate privacy controls.
- Production build, device checks, and deployment confirmation for every release.

## Provider boundaries

- Use each provider’s supported APIs and playback rules. Audiq must not extract audio from a video embed or bypass provider restrictions.
- Offline playback is only for content and providers that explicitly support it; streaming URLs are not converted into downloads.
- Podcasts, audiobooks, lossless tiers, and catalog-wide availability depend on a provider or rights holder offering the necessary access.
- Browser or Android background playback depends on the specific media source and platform lifecycle. A web page cannot guarantee that every embedded source will continue after the screen locks.

## Release gates

1. Install from the lockfile using the supported Node version.
2. Run the production web build and fix compile/type errors.
3. Exercise account, library sync, chat sharing, room authorization, and playback on desktop and Android.
4. Deploy only after the build succeeds, then check the live deployment and its configured service keys.
