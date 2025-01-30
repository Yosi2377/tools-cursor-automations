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
      console.error('No authorization header provided')
      throw new Error('No authorization header')
    }

    console.log('Auth header:', authHeader) // Debug log

    // Create a client with the user's JWT
    const userClient = createClient(
      supabaseUrl,
      supabaseServiceRole, // Use service role key for admin operations
      {
        auth: {
          persistSession: false,
        },
      }
    )
    
    // Get the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user is authenticated using the token
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized')
    }

    console.log('User authenticated:', user.id) // Debug log

    // Check if user is admin
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_admin_secure', { user_id: user.id })
    
    if (adminCheckError || !isAdmin) {
      console.error('Admin check error:', adminCheckError)
      throw new Error('Not authorized as admin')
    }

    console.log('Admin status confirmed') // Debug log

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        const { data: { users }, error } = await supabase.auth.admin.listUsers()
        if (error) {
          console.error('Error fetching users:', error)
          throw error
        }
        
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
        if (error) {
          console.error('Error deleting user:', error)
          throw error
        }
        
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

      case 'PATCH': {
        const { userId, password, action } = await req.json()
        
        if (action === 'update_password') {
          const { error } = await supabase.auth.admin.updateUserById(
            userId,
            { password: password }
          )
          
          if (error) {
            console.error('Error updating password:', error)
            throw error
          }
          
          console.log('Successfully updated password for user:', userId)
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
        
        throw new Error(`Invalid action: ${action}`)
      }

      default:
        throw new Error(`Method ${req.method} not allowed`)
    }
  } catch (error) {
    console.error('Edge function error:', error)
    
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