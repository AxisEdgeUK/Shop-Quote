---
name: Drizzle ORM query builder immutability
description: Drizzle builder methods return new instances; cannot conditionally append .where() after building
---

Drizzle ORM uses an immutable builder pattern. Each method returns a new builder instance.

**Why:** Calling `query.where(...)` after `const query = db.select()...` does NOT mutate `query`; the result is silently discarded.

**How to apply:** Always build the full query in one chain. For conditional where clauses use a ternary inline:
```ts
const rows = await db.select().from(table)
  .where(condition ? eq(table.col, val) : undefined)
  .orderBy(table.name);
```
Passing `undefined` to `.where()` is safe — Drizzle treats it as no filter.
