import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from '@/lib/supabase'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export async function signOut() {
  await supabase.auth.signOut()
}
