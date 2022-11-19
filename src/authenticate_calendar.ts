import { google } from "googleapis";
import * as path from "path";
import * as fs from "fs/promises";
import { OAuth2Client } from "google-auth-library";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { WORDLE_CALENDAR_ID } from "./spelling_bee_season_manager";
const {authenticate} = require('@google-cloud/local-auth');

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.readonly'];

async function loadSavedCredentialsIfExist() {
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

async function listFiles(authClient:JSONClient|null) {
  const calendarClient = google.calendar({version: 'v3', auth: authClient!});
  var eventList = (await calendarClient.events.list({calendarId:WORDLE_CALENDAR_ID})).data.items
  var now  = new Date()
  for (var e of eventList!) {
    if (new Date(e.start?.dateTime?.toString()!) < now && new Date(e.end?.dateTime?.toString()!) > now) {
      console.log(e)
    }
  }
//  console.log(await (await calendarClient.calendarList.list()).data.items?.map(i => i.id))
}

authorize().then(listFiles).catch(console.error);