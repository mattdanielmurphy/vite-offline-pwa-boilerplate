import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken'; // Import JWT for token verification

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
console.log('key,ulr',supabaseKey,supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const url = new URL(request.url); // Create a URL object from the request
  const token = url.searchParams.get('token'); // Get the token from query parameters

  // Add debug logging
  console.log('Token received:', token);

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
  }

  // Verify token
  const decoded = await new Promise((resolve, reject) => {
    if (!process.env.JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'JWT_SECRET is not defined' }), { status: 500 });
    }
    jwt.verify(token as string, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 }));
      } else {
        resolve(decoded);
      }
    });
  }).catch(err => err);

  // Add debug logging for decoded token
  console.log('Decoded token:', decoded);

  if (decoded instanceof Response) {
    return decoded;
  }

  // Extract address and optional parameters
  const address = (decoded as any).address;
  const shouldDelete = (decoded as any).delete === true;

  // Add debug logging
  console.log('Should delete?', shouldDelete);
  console.log('Address:', address);

  if (shouldDelete) {
    console.log('Attempting to delete:', address);
    // Delete the record
    const { error: deleteError } = await supabase
      .from('report-email-recipients')
      .delete()
      .eq('address', address);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete subscription' }), { status: 500 });
    }
    
    console.log('Delete successful');

    return new Response(`
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <style>
            :root {
              color-scheme: light dark;
            }
            
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              margin-top: 50px;
              padding: 20px;
              background-color: #ffffff;
              color: #000000;
            }

            @media (prefers-color-scheme: dark) {
              body {
                background-color: #1a1a1a;
                color: #ffffff;
              }
            }

            h1 {
              margin-bottom: 1rem;
            }

            p {
              margin: 0.5rem 0;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <h1>Deletion Confirmed Successfully</h1>
          <p>You have successfully deleted <strong>${address}</strong> from receiving updates.</p>
          <p>You may now close this window.</p>
        </body>
      </html>
    `, { 
      status: 200, 
      headers: { 'Content-Type': 'text/html' } 
    });
  }

  // First fetch the existing record
  const { data: existingRecord, error: fetchError } = await supabase
    .from('report-email-recipients')
    .select('*')
    .eq('address', address)
    .single();

  // Create update object starting with existing values
  const updateData = {
    address,
    confirmed: true,
    frequency: existingRecord?.frequency || 'weekly',  // Use existing or default
    enabled: existingRecord?.enabled ?? true           // Use existing or default
  };

  // Override with any new values from the token
  if ((decoded as any).frequency !== undefined) {
    updateData.frequency = (decoded as any).frequency;
  }
  if ((decoded as any).enabled !== undefined) {
    updateData.enabled = (decoded as any).enabled;
  }

  // Update database
  const { data, error } = await supabase
    .from('report-email-recipients')
    .upsert([updateData], { onConflict: 'address' });

  if (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500 });
  }

  // Create the status message and heading based on enabled status
  const statusMessage = updateData.enabled 
    ? `You'll be receiving <strong>${updateData.frequency}</strong> updates at <strong>${address}</strong>.`
    : `You have unsubscribed <strong>${address}</strong> from receiving updates.`;

  const heading = updateData.enabled
    ? "Subscription Confirmed Successfully"
    : "Unsubscription Confirmed Successfully";

  return new Response(`
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <style>
          :root {
            color-scheme: light dark;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            margin-top: 50px;
            padding: 20px;
            background-color: #ffffff;
            color: #000000;
          }

          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1a1a1a;
              color: #ffffff;
            }
          }

          h1 {
            margin-bottom: 1rem;
          }

          p {
            margin: 0.5rem 0;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <h1>${heading}</h1>
        <p>${statusMessage}</p>
        <p>You may now close this window.</p>
      </body>
    </html>
  `, { 
    status: 200, 
    headers: { 'Content-Type': 'text/html' } 
  });
}
