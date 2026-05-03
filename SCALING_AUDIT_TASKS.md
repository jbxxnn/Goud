# Scaling Audit Tasks

This file explains the work needed to keep the project fast as bookings, shifts, users, locks, and dashboard usage grow.

The main idea: the app already has some good foundations, but several important screens still ask the database broad questions. That may feel fine with a small dataset, but as the tables grow those same questions can become slow. The tasks below make those questions more targeted.

## Priority 0: Validate Current Production Behavior

### Capture slow query evidence

- [ ] Use Supabase Query Performance or `pg_stat_statements` to find the slowest and most repeated queries.

Current state: the audit was done from code, so we can see likely scaling risks, but we have not measured the live database.

What this does: it shows which database calls are actually slow or frequently repeated in production.

Why we need it: this prevents guessing. We should fix the queries that users actually hit the most before spending time on less important ones.

### Run query plans

- [ ] Run `EXPLAIN (ANALYZE, BUFFERS)` for availability, heatmap, bookings list, booking lock, and dashboard metric queries.

Current state: the code has indexes, but we do not know whether Postgres is using them for the real queries.

What this does: it shows whether the database is using indexes or scanning large tables row by row.

Why we need it: an index only helps if the query shape matches it. Query plans confirm that the fix works.

### Confirm table sizes and growth

- [ ] Check row counts and monthly growth for `bookings`, `shifts`, `booking_locks`, `users`, `staff`, `shift_services`, and `staff_services`.

Current state: some tables may still be small, but the app design suggests `bookings`, `booking_locks`, and calendar data will grow fastest.

What this does: it identifies which tables are closest to becoming a bottleneck.

Why we need it: a query that is fine at 1,000 rows may fail at 1,000,000 rows. Growth rate tells us how urgent each fix is.

### Confirm migration usage

- [ ] Confirm whether `supabase/migrations/main.sql` is only a schema snapshot or is actually applied as a migration.

Current state: the repo has normal dated migrations and also a `main.sql` schema file.

What this does: it prevents us from editing or relying on the wrong schema source.

Why we need it: database fixes must go into the migration path that production actually uses.

## Priority 1: Add Missing Hot-Path Indexes

Indexes are like a table of contents for the database. Without the right index, the database may have to read a large part of a table to find a few rows.

### Add booking conflict indexes

- [ ] Add `bookings (shift_id, start_time, end_time) where status <> 'cancelled'`.

Current state: booking conflict checks filter by shift, time overlap, and non-cancelled status, but the existing booking indexes mostly cover time/status rather than the full conflict pattern.

What this does: it helps the database quickly answer, "Is this exact shift already booked during this time?"

Why we need it: this query runs during availability and booking lock flows. If it slows down, users will feel the booking flow lag.

### Add booking list and date indexes

- [ ] Add `bookings (start_time desc) where status <> 'cancelled'`.
- [ ] Add `bookings (client_id, start_time desc)`.
- [ ] Add `bookings (created_by, start_time desc)`.
- [ ] Add `bookings (staff_id, start_time)`.
- [ ] Add `bookings (location_id, start_time)`.

Current state: bookings are often filtered by client, creator, staff, location, date, and status, but not all of those combinations have matching indexes.

What this does: it makes booking history, admin lists, staff views, client views, and location filters much faster.

Why we need it: booking rows will grow continuously. These indexes keep common list pages from slowing down as history grows.

### Add shift lookup indexes

- [ ] Add `shifts (location_id, start_time, end_time) where is_active = true`.
- [ ] Add `shifts (parent_shift_id, exception_date)`.

Current state: availability looks for shifts by location and time range, and recurring shift logic looks up exception rows by parent shift and date.

What this does: it lets Postgres jump directly to shifts relevant to a location/day or recurring exception.

Why we need it: calendar and availability screens depend on shift lookup speed.

### Add service qualification indexes

- [ ] Add `shift_services (service_id, shift_id)`.
- [ ] Add `staff_services (service_id, is_twin_qualified, staff_id)`.

Current state: the app first finds which shifts can perform a service, then uses those IDs in later queries. Twin bookings also check staff qualification.

What this does: it speeds up the "who can perform this service?" step.

Why we need it: this lookup is part of the public booking flow, so it needs to stay fast under traffic.

### Add lock and blackout indexes

- [ ] Add `booking_locks (shift_id, expires_at, start_time, end_time)`.
- [ ] Add `blackout_periods (location_id, start_date, end_date) where is_active = true`.

Current state: locks are checked by shift, expiry, and time overlap, but the existing lock indexes do not match that exact pattern. Blackouts are checked by location and date range.

What this does: it makes temporary slot locks and blackout checks fast.

Why we need it: locks are checked every time a user tries to reserve a slot. Slow lock checks directly hurt checkout speed.

Production note: use `CREATE INDEX CONCURRENTLY` where possible so indexes can be created without blocking normal table writes.

## Priority 2: Refactor Availability and Heatmap Queries

Availability is the highest-risk scaling area because it sits in the public booking flow.

### Move large shift ID filtering into SQL

- [ ] Replace large application-side `allowedShiftIds` and `IN (...)` patterns with a database-side RPC or SQL query that joins `shift_services` to `shifts`.

Current state: the app asks for all shift IDs that support a service, then sends those IDs back into several other queries.

What this does: it lets the database perform the join internally instead of passing big ID lists through the API layer.

Why we need it: large `IN (...)` lists become slow and awkward as the number of shifts grows.

### Read only active shifts where appropriate

- [ ] Ensure availability excludes inactive shifts at the query level when inactive shifts should not be bookable.

Current state: availability fetches shift data and maps `is_active`, but the query does not consistently limit results to active rows.

What this does: it reduces unnecessary rows before they reach application code.

Why we need it: filtering in the database is cheaper than fetching extra rows and ignoring them later.

### Push conflict filtering into joined SQL

- [ ] Make booking conflict checks use SQL joins and composite indexes instead of app-side grouping.

Current state: the app fetches bookings for allowed shifts, groups them in memory, and then generates slots.

What this does: it narrows the conflict data before it leaves the database.

Why we need it: as bookings grow, moving less data over the network keeps the booking flow fast.

### Narrow sitewide break reads

- [ ] Replace `select('*')` on `sitewide_breaks` with only the fields used by slot generation.

Current state: availability fetches all columns for active sitewide breaks.

What this does: it reduces payload size and avoids pulling unused data.

Why we need it: broad reads get more expensive as schemas grow, even when row counts are small.

### Limit heatmap range

- [ ] Add a maximum allowed heatmap range.

Current state: heatmap accepts a start and end date and calculates availability for the full range.

What this does: it prevents accidental or malicious requests for very large date ranges.

Why we need it: one very wide heatmap request could force the server to process too much calendar data.

### Verify cache invalidation

- [ ] Verify caches clear when shifts, bookings, locks, breaks, services, or locations change.

Current state: availability and heatmap have in-memory caching.

What this does: it ensures cached slots are fast but not stale.

Why we need it: stale availability can show slots that are no longer valid.

Relevant files:

- `app/api/availability/route.ts`
- `app/api/availability/heatmap/route.ts`
- `lib/availability/cache.ts`
- `lib/availability/slots.ts`

## Priority 3: Reduce Expensive Counts and Wide Booking Reads

### Replace status-count fanout

- [ ] Replace multiple booking status count queries with one grouped SQL/RPC query.

Current state: the bookings admin endpoint can run separate exact count queries for all, pending, confirmed, cancelled, ongoing, completed, and no-show bookings.

What this does: it asks the database for grouped counts in one pass.

Why we need it: seven table scans are much more expensive than one grouped query.

### Stop selecting full booking rows in list endpoints

- [ ] Replace `bookings.*` with only the columns shown in the table or modal.

Current state: some booking list queries fetch every booking column, then also fetch related services, locations, staff, and tags.

What this does: it reduces the amount of data loaded for each page.

Why we need it: list pages should be light. Full booking detail can be fetched only when a user opens a specific booking.

### Narrow nested tag reads

- [ ] Replace `booking_tags (*)` with specific tag columns.

Current state: booking tags are fetched with every tag column.

What this does: it fetches only the tag fields the UI needs.

Why we need it: repeated nested `*` reads multiply payload size across every booking row.

### Reduce exact counts

- [ ] Decide which exact counts are required and which can be estimated or cached.

Current state: several dashboard and list endpoints use exact counts.

What this does: it avoids expensive count scans when the UI does not need perfect real-time precision.

Why we need it: exact counts become slower as tables grow, especially on filtered data.

### Cap request limits

- [ ] Add maximum allowed values for `limit` query params.

Current state: some API routes accept caller-provided limits.

What this does: it prevents a request from asking for too many rows at once.

Why we need it: one oversized request can create unnecessary database and server load.

Relevant files:

- `app/api/bookings/route.ts`
- `app/api/dashboard/stats/route.ts`
- `app/api/dashboard/insights/route.ts`
- `app/api/dashboard/upcoming/route.ts`
- `app/api/dashboard/recent-bookings/route.ts`

## Priority 4: Move Dashboard Aggregation Into SQL

### Aggregate dashboard data in the database

- [ ] Replace app-side dashboard aggregation over large booking windows with SQL aggregation.

Current state: dashboard insights fetch many booking rows and then calculate totals, revenue, trends, and service distribution in JavaScript.

What this does: it lets Postgres calculate totals and return small summary results.

Why we need it: databases are built for aggregation. The app server should not pull thousands of rows just to count and sum them.

### Add dashboard RPCs or views

- [ ] Add RPCs or views for appointments by period, revenue by period, service distribution, status trends, and recent activity.

Current state: dashboard logic is spread across API route code.

What this does: it centralizes the metric calculations close to the data.

Why we need it: SQL summaries are easier to index, measure, and optimize.

### Consider cached daily metrics

- [ ] Consider cached or materialized daily metrics if dashboards become high-traffic.

Current state: dashboards calculate metrics on demand.

What this does: it precomputes common metrics so reads are cheap.

Why we need it: dashboards are often opened repeatedly by staff/admin users, and repeated calculations waste database work.

Relevant files:

- `app/api/dashboard/stats/route.ts`
- `app/api/dashboard/insights/route.ts`

## Priority 5: Narrow `select('*')` Usage

### Audit broad selects

- [ ] Review all `select('*')` calls on high-growth tables.

Current state: there are many broad selects across users, bookings, shifts, staff, services, and admin pages.

What this does: it identifies where the app is asking for every column instead of just needed columns.

Why we need it: broad selects become slower as tables gain more columns, even if the row count is controlled.

### Replace broad selects on important tables

- [ ] Replace broad selects on `users`, `bookings`, `shifts`, `staff`, and `services` with explicit column lists.

Current state: some pages load full records for authorization or list display.

What this does: it makes each query smaller and clearer.

Why we need it: smaller queries are faster, cheaper, and safer because they avoid exposing or moving unnecessary fields.

### Keep broad selects only where safe

- [ ] Keep broad selects only for small lookup/admin tables where row count and schema width are controlled.

Current state: not every `select('*')` is equally dangerous.

What this does: it focuses cleanup on high-impact tables.

Why we need it: this keeps the task practical and avoids unnecessary refactors.

Useful search:

```bash
rg -F ".select('*'" app lib components calendar
```

## Priority 6: Make Search Scale

### Enable trigram search support

- [ ] Enable `pg_trgm` if not already enabled.

Current state: user and staff search uses `ilike '%term%'`.

What this does: it gives Postgres the extension needed for fast partial text matching.

Why we need it: normal indexes usually cannot help with "contains this text anywhere" searches.

### Add trigram indexes

- [ ] Add trigram indexes for `users.email`, `users.first_name`, `users.last_name`, `staff.email`, `staff.first_name`, and `staff.last_name`.

Current state: searching names/emails may require scanning many rows.

What this does: it lets the database find partial text matches through an index.

Why we need it: staff/client search should stay quick even when there are many users.

### Consider normalized search columns

- [ ] Consider normalized search columns or full-text search if multi-field search grows more complex.

Current state: search is handled through multiple `OR` conditions.

What this does: it creates a cleaner search model if the current approach becomes hard to optimize.

Why we need it: complex search should not become a slow chain of text filters.

Relevant files:

- `lib/database/users.ts`
- `app/api/staff/route.ts`
- `lib/database/staff.ts`

## Priority 7: Review Supabase RLS and Views

### Run Supabase advisors

- [ ] Run Supabase advisors against the project.

Current state: the code review found likely RLS/view areas to check, but advisors can catch database-level issues directly.

What this does: it asks Supabase to report security and performance warnings.

Why we need it: Supabase-specific issues can be easy to miss from application code alone.

### Verify view security

- [ ] Verify all exposed views use `security_invoker = true` or are otherwise protected.

Current state: the repo contains view security fix scripts, but this needs confirmation against the active schema.

What this does: it ensures views respect the caller's permissions.

Why we need it: insecure views can bypass row-level security.

### Review role-check policies

- [ ] Review RLS policies that repeatedly query `public.users` for role checks.

Current state: many policies check a user's role by querying `public.users`.

What this does: it checks whether policy evaluation itself is adding overhead.

Why we need it: every query also runs RLS checks. Slow policies make otherwise good queries slower.

### Consider faster role checks if needed

- [ ] Consider helper functions or JWT app metadata for role checks if policy overhead becomes measurable.

Current state: roles live in `public.users` and are checked repeatedly.

What this does: it can reduce repeated role lookups if policy cost is high.

Why we need it: this is only worth doing if measurement shows RLS role checks are a bottleneck.

## Acceptance Criteria

- [ ] Availability endpoint stays fast with realistic production-size `bookings`, `shifts`, and `booking_locks`.
- [ ] Heatmap endpoint does not degrade linearly with all historical shifts for a service.
- [ ] Bookings admin list avoids wide payloads and multiple exact count scans per request.
- [ ] Dashboard endpoints aggregate in the database or use cached metrics.
- [ ] Search queries use indexes instead of sequential scans.
- [ ] Every new index is validated with `EXPLAIN`.
- [ ] No unrelated code or schema changes are included in the scaling work.
