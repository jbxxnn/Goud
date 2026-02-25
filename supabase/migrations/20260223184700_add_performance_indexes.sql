-- Index for availability and heatmap queries on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_start_end_time ON public.bookings(start_time, end_time);

-- Index for shift lookups by date range
CREATE INDEX IF NOT EXISTS idx_shifts_start_end_time ON public.shifts(start_time, end_time);

-- Index for faster status-based filtering (often used with dates)
CREATE INDEX IF NOT EXISTS idx_bookings_status_start_time ON public.bookings(status, start_time);
