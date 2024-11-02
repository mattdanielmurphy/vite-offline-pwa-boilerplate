import nodemailer, { Transporter } from 'nodemailer';

import { google } from "googleapis";
import jwt from 'jsonwebtoken'; // Import JWT for token generation

const createTransporter = async (): Promise<Transporter> => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const accessToken = await new Promise<string>((resolve, reject) => {
      oauth2Client.getAccessToken((err: Error | null, token: string | null | undefined) => { // Added undefined to token type
        if (err) {
          console.log("*ERR: ", err);
          reject(err);
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error("No access token received"));
        }
      });
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Use host instead of service
      port: 587, // Use the appropriate port for Gmail
      secure: false, // Use true for port 465, false for other ports
      auth: {
        type: "OAuth2",
        user: process.env.USER_EMAIL,
        accessToken,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
      },
    });
    return transporter;
  } catch (err) {
    console.error("Error creating transporter:", err);
    throw err; // Rethrow the error for handling in the calling function
  }
};

export async function POST(request: Request) {
  const emails = await request.json();

  try {
    const emailTransporter = await createTransporter();

    for (const email of emails) {
      const { address, subject, text, includeConfirmationLink, ...tokenParams } = email;
      
      if (!process.env.JWT_SECRET) {
        return new Response(JSON.stringify({ error: 'JWT_SECRET is not defined' }), { status: 500 });
      }

      // Forward all params except the email metadata
      const token = jwt.sign(
        { address, ...tokenParams }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );

      if (!process.env.VERCEL_URL) {
        throw new Error('VERCEL_URL is not defined');
      }

      const confirmationLink = `${process.env.VERCEL_URL.includes('localhost') ? 'http://' : 'https://'}${process.env.VERCEL_URL}/api/confirm?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: address,
        subject,
        text: `${text}${includeConfirmationLink ? `\n${confirmationLink}` : ''}`,
      };

      await emailTransporter.sendMail(mailOptions);
    }

    return new Response(JSON.stringify({ message: 'Emails sent successfully' }), { status: 200 });
  } catch (err) {
    console.error('Error sending email:', err);
    return new Response(JSON.stringify({ error: 'Failed to send emails' }), { status: 500 });
  }
}
