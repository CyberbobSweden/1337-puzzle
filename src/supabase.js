import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jraxlsdkutorywrvumqo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYXhsc2RrdXRvcnl3cnZ1bXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODE0MTksImV4cCI6MjA5NDk1NzQxOX0.WmgwJR-hxh24W1EI8yW9LaEe2ZmFS29jg899uc64mxc'
)

export const ADMIN_EMAIL = 'richard.x.bostrom@gmail.com'
