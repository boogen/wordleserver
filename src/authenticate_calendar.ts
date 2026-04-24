import { google } from "googleapis";
import * as path from "path";
import { promises as fs } from 'fs';
import { OAuth2Client } from "google-auth-library";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { SPELLING_BEE_CALENDAR_ID } from "./spelling_bee_season_manager";
import { authenticate } from '@google-cloud/local-auth';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/drive.readonly'];

async function loadSavedCredentialsIfExist():Promise<any> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      const client = new google.auth.OAuth2(clientId, clientSecret);
      client.setCredentials({ refresh_token: refreshToken });
      return client;
    }
    
    // Fallback to token.json only if we can read it
    try {
      const content = await fs.readFile(TOKEN_PATH, 'utf-8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (e) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client:JSONClient) {
  // Only try to save if we have credentials file, otherwise we are using env vars
  try {
    let keys;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && clientSecret) {
        keys = { installed: { client_id: clientId, client_secret: clientSecret } };
    } else {
        const content = await fs.readFile(CREDENTIALS_PATH);
        keys = JSON.parse(content.toString());
    }

    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  } catch (e) {
    // If we can't save (e.g. read-only filesystem), just skip. 
    // In prod we should be using env vars anyway.
  }
}

export async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  
  // If we reach here, we don't have env vars and don't have token.json
  // We check if we are in production - if so, we shouldn't attempt interactive auth
  if (process.env.NODE_ENV === 'production' || process.env.GOOGLE_CLIENT_ID) {
      console.warn("Google credentials not found. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are set.");
      return null;
  }

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  
  if (client && client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

//authorize()