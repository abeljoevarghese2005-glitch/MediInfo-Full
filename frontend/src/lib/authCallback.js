import { supabase } from './supabase'

function extractTokensFromUrl(url) {
  const u = new URL(url)
  const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''))
  const queryParams = u.searchParams
  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    code: queryParams.get('code'),
  }
}

// Exchanges the OAuth redirect URL for a Supabase session, then
// makes sure a users row + the correct role-profile row (patient_profiles /
// doctor_profiles) exist — creating them if this is the identity's first
// time signing in, or adding the intended role's profile if this identity
// already exists under a different role.
export async function handleOAuthRedirect(url) {
  const { accessToken, refreshToken, code } = extractTokensFromUrl(url)

  let sessionData
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) throw error
    sessionData = data
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url)
    if (error) throw error
    sessionData = data
  } else {
    throw new Error('No access token or auth code found in redirect URL')
  }

  const authUser = sessionData.session.user
  const intendedRole = localStorage.getItem('intended_role') || 'patient'
  const profileTable = intendedRole === 'doctor' ? 'doctor_profiles' : 'patient_profiles'

  let { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError
  }

  if (!profile) {
    // Brand-new identity: create the users row and the role-specific profile
    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        email: authUser.email,
        role: intendedRole,
        auth_provider: 'google',
        is_phone_verified: false,
      })
      .select()
      .single()

    if (insertError) throw insertError
    profile = newProfile

    const { error: roleProfileError } = await supabase
      .from(profileTable)
      .insert({ user_id: authUser.id })
    if (roleProfileError) throw roleProfileError
  } else {
    // Existing identity: check if they already have the intended role's profile
    const { data: existingRoleProfile, error: roleCheckError } = await supabase
      .from(profileTable)
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (roleCheckError) throw roleCheckError

    if (!existingRoleProfile) {
      // Same person, adding a second role to their existing account
      const { error: roleProfileError } = await supabase
        .from(profileTable)
        .insert({ user_id: authUser.id })
      if (roleProfileError) throw roleProfileError
    }
  }

  const [{ data: pp }, { data: dp }] = await Promise.all([
    supabase.from('patient_profiles').select('id').eq('user_id', authUser.id).maybeSingle(),
    supabase.from('doctor_profiles').select('id').eq('user_id', authUser.id).maybeSingle(),
  ])

  localStorage.removeItem('intended_role')
  localStorage.setItem('token', sessionData.session.access_token)

  const sessionUser = {
    ...profile,
    role: intendedRole,
    hasPatientProfile: !!pp,
    hasDoctorProfile: !!dp,
  }
  localStorage.setItem('user', JSON.stringify(sessionUser))

  return sessionUser
}