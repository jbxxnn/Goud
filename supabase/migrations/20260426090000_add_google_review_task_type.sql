ALTER TABLE public.assistant_tasks
ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.assistant_tasks
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assistant_tasks_task_type_check'
  ) THEN
    ALTER TABLE public.assistant_tasks
    ADD CONSTRAINT assistant_tasks_task_type_check
    CHECK (task_type IN ('general', 'google_review'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assistant_tasks_task_type
ON public.assistant_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_assistant_tasks_booking_id
ON public.assistant_tasks(booking_id);
