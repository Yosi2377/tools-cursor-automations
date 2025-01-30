import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceRole)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a client with the user's JWT
    const userClient = createClient(
      supabaseUrl,
      authHeader.replace('Bearer ', ''),
    )
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_admin_secure', { user_id: user.id })
    
    if (adminCheckError || !isAdmin) {
      console.error('Admin check error:', adminCheckError)
      throw new Error('Not authorized as admin')
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        const { data: { users }, error } = await supabase.auth.admin.listUsers()
        if (error) throw error
        
        console.log('Successfully fetched users:', users.length)
        return new Response(
          JSON.stringify({ users }), 
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }

      case 'DELETE': {
        const { userId } = await req.json()
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) throw error
        
        console.log('Successfully deleted user:', userId)
        return new Response(
          JSON.stringify({ success: true }), 
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }

      default:
        throw new Error(`Method ${req.method} not allowed`)
    }
  } catch (error) {
    console.error('Edge function error:', error)
    
    // Ensure we always return a JSON response, even for errors
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }), 
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
})