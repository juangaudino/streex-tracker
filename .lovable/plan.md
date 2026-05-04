
# Fix Database Persistence in Streex Earnings Tracker

## Problem
The `addWeek` function sends a client-generated `id` field in the INSERT payload. The `weeks` table has `id` with `DEFAULT gen_random_uuid()`, so sending a client-side UUID may cause silent conflicts or RLS issues. Additionally, there is no error handling — the UI updates optimistically even when the DB insert fails.

## Changes (single file: `src/hooks/useWeekStore.ts`)

### 1. Fix `addWeek` — remove `id`, add error handling, use DB response
- Remove `id: w.id` from the insert payload — let Supabase auto-generate it.
- Chain `.select().single()` to get the inserted row back.
- Check for errors before updating local state.
- Use the returned `data` (with the DB-generated id) to update state.

### 2. Fix `updateWeek` — add `user_id` filter and error handling
- Add `.eq("user_id", user.id)` alongside `.eq("id", w.id)`.
- Add error handling with `console.error` and toast/alert on failure.
- Only update local state after confirmed success.

### 3. Fix `deleteWeek` — add `user_id` filter and error handling
- Add `.eq("user_id", user.id)` alongside `.eq("id", id)`.
- Add error handling.

### 4. Fix `importLocalData` — remove `id` from bulk insert
- Remove `id: w.id` from each row in the batch insert.
- Add error handling for the bulk insert.

### 5. Fix `updateSettings` — add error handling
- Check for upsert errors before confirming success.

### 6. Refetch after mutations
- After successful `addWeek`, call `reload()` to sync state from DB (source of truth).
- Same for `importLocalData` (already calls reload).

No UI, styling, or schema changes needed.
