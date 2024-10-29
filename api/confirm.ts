import jwt from 'jsonwebtoken'; // Import JWT for token verification
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
console.log('key,ulr',supabaseKey,supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const url = new URL(request.url); // Create a URL object from the request
  const token = url.searchParams.get('token'); // Get the token from query parameters

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
  }

  // Wrap jwt.verify in a Promise
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
  }).catch(err => err); // Catch any errors

  if (decoded instanceof Response) {
    return decoded; // Return the error response if there was an error
  }

  // Logic to update the user's subscription status in the database
  const address = (decoded as any).address;
  const frequency = (decoded as any).frequency;
  const enabled = (decoded as any).enabled;

  // Insert or update subscription details in Supabase
  const { data, error } = await supabase
    .from('report-email-recipients') // Replace with your actual table name
    .upsert([{ address, frequency, enabled }], { onConflict: 'address' }); // Upsert based on email

  if (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500 });
  }

  return new Response(`
    <html>
      <head>
        <style>
          body {
            font-family: sans-serif;
            text-align: center;
            margin-top: 50px;
          }
        </style>
      </head>
      <body>
        <h1>Subscription Confirmed Successfully</h1>
        <p>Email: ${address}</p>
        <p>You may now close this window.</p>
      </body>
    </html>
  `, { status: 200, headers: { 'Content-Type': 'text/html' } });
}
