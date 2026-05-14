import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { paymentProvider } from '@/lib/payments'

/**
 * Transactional signup.
 *
 * Flow: create auth user → create Squad virtual account → insert seller row → sign in.
 * If any step fails after auth creation, we delete the auth user so we don't
 * leave orphan accounts.
 *
 * Auth admin operations require the service_role key. This route uses an admin
 * Supabase client for those, then the cookie-based client to land the session
 * in the browser at the end.
 */
export async function POST(request: Request) {
  const form = await request.json()

  // Validation
  const required = [
    'email', 'password', 'businessName', 'businessDescription',
    'legalFirstName', 'legalMiddleName', 'legalLastName',
    'bvn', 'dob', 'gender', 'phone', 'address',
  ]
  for (const field of required) {
    if (!form[field] || typeof form[field] !== 'string') {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
    }
  }
  if (form.bvn.length !== 11) {
    return NextResponse.json({ error: 'BVN must be 11 digits' }, { status: 400 })
  }
  if (form.password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  // Admin client (uses service role key — bypasses RLS, can manage auth users)
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server misconfigured' },
      { status: 500 },
    )
  }

  // Step 1: create auth user
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email: form.email,
    password: form.password,
    email_confirm: true,
  })
  if (createError || !createData.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'Could not create account' },
      { status: 400 },
    )
  }
  const userId = createData.user.id

  // Rollback helper
  async function rollback(reason: string, status: number) {
    await admin.auth.admin.deleteUser(userId).catch(() => {
      console.error('Rollback failed for user', userId)
    })
    return NextResponse.json({ error: reason }, { status })
  }

  // Step 2: create Squad virtual account
  const [year, month, day] = form.dob.split('-')
  const squadDob = `${month}/${day}/${year}`
  const customerIdentifier = `vend_${userId.replace(/-/g, '').slice(0, 20)}`

  let squadResult
  try {
    squadResult = await paymentProvider.createVirtualAccount({
      customerIdentifier,
      legalFirstName: form.legalFirstName,
      legalMiddleName: form.legalMiddleName,
      legalLastName: form.legalLastName,
      bvn: form.bvn,
      dob: squadDob,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      address: form.address,
      beneficiaryAccount: '0000000000',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment provider error'
    return rollback(msg, 502)
  }

  // Step 3: insert seller row (admin client bypasses RLS — needed because user
  // has no session yet)
  const { error: insertError } = await admin.from('sellers').insert({
    user_id: userId,
    business_name: form.businessName,
    legal_first_name: form.legalFirstName,
    legal_middle_name: form.legalMiddleName,
    legal_last_name: form.legalLastName,
    phone: form.phone,
    email: form.email,
    bvn: form.bvn,
    date_of_birth: form.dob,
    gender: form.gender,
    address: form.address,
    business_description: form.businessDescription,
    tier: 'verified',
    squad_virtual_account_number: squadResult.accountNumber,
    squad_bank_code: squadResult.bankCode,
    squad_customer_identifier: squadResult.customerIdentifier,
  })

  if (insertError) {
    // The Squad virtual account is left orphaned (Squad has no public delete
    // endpoint), but it's harmless — no seller record points to it, no webhook
    // will resolve to a seller. Cleanup task for production.
    return rollback(`Database error: ${insertError.message}`, 500)
  }

  // Step 4: sign the user in via the cookie-based client so the session
  // lands in the browser
  const supabase = createServerSupabase()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  })
  if (signInError) {
    return NextResponse.json({
      ok: true,
      warning: 'Account created but auto-login failed. Please log in.',
    })
  }

  return NextResponse.json({ ok: true })
}
