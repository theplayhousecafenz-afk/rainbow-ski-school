import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'

export async function PATCH(request: NextRequest) {
  const { id, handled } = await request.json()
  if (!id || typeof handled !== 'boolean') {
    return NextResponse.json({ error: 'id and handled are required' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { error } = await supabase.from('enquiries').update({ handled }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/enquiries')
  revalidatePath('/admin')
  return NextResponse.json({ success: true })
}
