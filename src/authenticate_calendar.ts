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
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client:JSONClient) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

export async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client!.credentials) {
    await saveCredentials(client!);
  }
  return client;
}

//authorize()