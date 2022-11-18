import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { calendar_v3, google } from "googleapis";
import { authorize } from "./authenticate_calendar";

export const WORDLE_CALENDAR_ID = 'c_7b24bc61465126503552c3db32dd57a0276ce670d5272d4810a9bc393bad669e@group.calendar.google.com'

export function getSpellingBeeSeasonManager():SpellingBeeSeasonManager {
    return instance;
}

class SpellingBeeSeasonManager {
    calendarClient:calendar_v3.Calendar|null;
    constructor() {
        this.calendarClient = null; 
        //authorize().then(auth_client => this.calendarClient = google.calendar({version: 'v3', auth: auth_client!}))
    }

    getCurrentSeason() {
        
    }

    endSeason() {
        
    }
}

const instance = new SpellingBeeSeasonManager();