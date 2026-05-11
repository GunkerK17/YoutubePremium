// src/lib/services/logService.js

import { supabase } from '../supabase'

export async function logActivity(userEmail, action, target = '', detail = '') {
  // Fire and forget — không block UI
  supabase.from('activity_logs').insert({
    user_email: userEmail,
    action,
    target,
    detail,
  }).then(({ error }) => {
    if (error) console.warn('Log error:', error.message)
  })
}

export async function getLogs({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}