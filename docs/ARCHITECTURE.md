# AudiQ Backend Architecture

## Overview

AudiQ backend is built using a layered architecture.

```
Frontend (Next.js)
        │
        ▼
Express API
        │
        ▼
Controllers
        │
        ▼
Music Engine
        │
 ┌──────┼──────────────┐
 │      │              │
Search Stream      AI (Future)
 │      │
 ▼      ▼
Provider Engine
 │
 ├── YouTube
 ├── JioSaavn
 ├── Audius
 └── Deezer
```

---

## Core Components

### Controllers

Responsible only for receiving HTTP requests and returning responses.

No business logic.

---

### Music Engine

Acts as the orchestrator.

Responsibilities:

- Search providers
- Merge results
- Rank results
- Remove duplicates

---

### Stream Engine

Responsible for playback.

Responsibilities:

- Cache
- Stream extraction
- URL refresh
- Proxy streaming

---

### Provider Layer

Each provider implements the same interface.

Example:

- YouTube
- Audius
- Deezer
- JioSaavn

---

## Future Components

- AI Engine
- Recommendation Engine
- Playlist Engine
- Analytics Engine
- Notification Engine
