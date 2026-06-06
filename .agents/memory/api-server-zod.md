---
name: API server zod subpath resolution
description: esbuild in the api-server cannot resolve the zod/v4 subpath export
---

The api-server uses esbuild for bundling. esbuild cannot resolve `zod/v4` subpath exports.

**Why:** The api-server's build.mjs bundles with esbuild which doesn't handle subpath package exports the same way Node.js does, so `import { z } from "zod/v4"` fails at build time.

**How to apply:** In api-server route files, never import `zod/v4` directly. Options:
1. Import Zod schemas from `@workspace/api-zod` (the generated schemas already use zod internally)
2. Write manual validation functions (e.g. `parseBulkIds`) instead of creating ad-hoc zod schemas
