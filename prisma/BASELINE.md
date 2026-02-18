# Prisma P3005: Database not empty (baseline)

Your database already has tables, but Prisma Migrate has no record of applied migrations. Choose one option below.

---

## Option A: Database already matches current schema (e.g. you used `db push`)

If the database is already in sync with `schema.prisma` (all tables/columns exist), mark all existing migrations as **already applied** so Prisma stops treating the DB as empty. Then future migrations will apply normally.

Run these in the **web** folder (same directory as `package.json`):

```bash
npx prisma migrate resolve --applied 20260218051000_add_payments_receipts_refinement
npx prisma migrate resolve --applied 20260218070000_add_payment_performance_indexes
npx prisma migrate resolve --applied 20260218100000_payment_method_optional
npx prisma migrate resolve --applied 20260218110000_meter_readings_index_select
```

Then:

```bash
npx prisma migrate deploy
```

Deploy will do nothing this time (all applied). Any **new** migrations you add later will run on `migrate deploy`.

---

## Option B: Development database – OK to wipe and re-apply

If this DB has no important data and you can reset it:

```bash
npx prisma migrate reset
```

This will:

1. Drop the database (or reset it)
2. Re-create it and apply **all** migrations in order
3. Run `prisma generate` and your seed (if configured)

After that, `npx prisma migrate deploy` will work in this environment.

---

## Option C: Production / DB has data and is older than schema

If the database has data and does **not** yet have all changes from the four migrations:

1. **Back up the database.**
2. Mark only the migrations that are **already** reflected in the DB as applied (using `prisma migrate resolve --applied <migration_name>` for each).
3. Run `npx prisma migrate deploy` to apply the remaining migrations.

If you're unsure which migrations are already applied, inspect the DB (tables/columns) and compare with each migration SQL, or run one migration manually and then mark it applied.

---

## Reference

- [Prisma: Baselining a database](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
- Migration names are the **folder** names under `prisma/migrations/` (e.g. `20260218110000_meter_readings_index_select`).
