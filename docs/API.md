# AudiQ API

## Music

### Search

GET

```
/api/music/search?q=
```

Returns music from all providers.

---

## Stream

### Metadata

GET

```
/api/stream/info/:videoId
```

Returns

- title
- artist
- duration
- thumbnail

---

### Playback

GET

```
/api/stream/play/:videoId
```

Streams audio.

---

## Health

GET

```
/health
```

Returns

- status
- uptime
- cache statistics
- memory usage