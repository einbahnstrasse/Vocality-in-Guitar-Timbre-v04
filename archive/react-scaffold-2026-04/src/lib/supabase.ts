import { createClient } from '@supabase/supabase-js'
import type { Responses, UserInfo } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface SubmissionPayload {
  user: UserInfo
  responses: Responses
}

export async function submitResponses(payload: SubmissionPayload): Promise<void> {
  const { error } = await supabase.from('experiment_responses').insert({
    first_name: payload.user.firstName,
    last_name: payload.user.lastName,
    responses: payload.responses,
    completed_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
}

/*
  Supabase table SQL — run this once in your Supabase SQL editor:

  CREATE TABLE experiment_responses (
    id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at   timestamptz DEFAULT now(),
    first_name   text        NOT NULL,
    last_name    text        NOT NULL,
    responses    jsonb       NOT NULL,
    completed_at timestamptz
  );

  -- Allow anonymous inserts (for the PWA)
  ALTER TABLE experiment_responses ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "allow_insert" ON experiment_responses
    FOR INSERT WITH CHECK (true);
*/
