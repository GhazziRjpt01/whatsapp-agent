import { env } from '../config/env.js'
import { memoryStore } from './memoryStore.js'
import { supabaseStore } from './supabaseStore.js'

export const db = env.dataStore === 'supabase' ? supabaseStore : memoryStore

export function getStoreName() {
  return env.dataStore
}
