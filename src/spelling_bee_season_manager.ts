import { string } from "@hapi/joi";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { calendar_v3, drive_v3, google } from "googleapis";
import { getSeasonRules, SeasonRules } from "./api/v4/season_rules";
import { authorize } from "./authenticate_calendar";

export const SPELLING_BEE_CALENDAR_ID = 'c_58d50fa0fa48d9285fcf5ca00f19536bcbbad820b1c5371b318f44fc29b3e2b5@group.calendar.google.com'
export const SPELLING_BEE_DUEL_CALENDAR_ID = 'c_b43a56a317d5b0484b290862afb98174a2183abea24ce71d9c34929f0debbe1c@group.calendar.google.com'


export function getSpellingBeeSeasonManager():SpellingBeeSeasonManager {
    return instance;
}

class CachedRules {
    constructor(public rules:SeasonRules, public time:Date) {}
    isExpired():boolean {
        return this.rules.getSecondsToEnd() < 0 && !this.rules.endTime === null;
    }
}

class SpellingBeeSeasonManager {
    calendarClient:calendar_v3.Calendar|null;
    driveClient:drive_v3.Drive|null;
    spellingBeeRules:Map<string, CachedRules> = new Map();
    rulesThrottle:Map<string, number> = new Map(); 
    constructor() {
        this.calendarClient = null; 
        this.driveClient = null;
    }

    async initCalendarClient() {
        var auth_client = await authorize()
        this.calendarClient = google.calendar({version: 'v3', auth: auth_client!})
        this.driveClient = google.drive({version:'v3', auth:auth_client})
    }

    timeToNextSeason(eventList:calendar_v3.Schema$Event[]|undefined, now:Date):number {
        if (!eventList) {
            return 15
        }
        for (var e of eventList!) {
            if (new Date(e.start?.dateTime?.toString()!) > now && new Date(e.start?.dateTime?.toString()!).getTime() < now.getTime() + (15 * 60000)) {
                return (new Date(e.start?.dateTime?.toString()!).getTime() - now.getTime()) / 60000
            }
        }
        return 15;
    }

    async getCurrentDuelSeason() {
        return this.getSeasonRules(SPELLING_BEE_DUEL_CALENDAR_ID, "duel")
    }

    async getCurrentSeason() {
        return this.getSeasonRules(SPELLING_BEE_CALENDAR_ID, "regular")
    }

    async getSeasonRules(calendarId:string, type:string) {
        if (this.spellingBeeRules.has(type) && (new Date().getTime() - this.spellingBeeRules.get(type)!.time.getTime()) / (1000 * 60) < this.rulesThrottle.get(type)! ) {
            return this.spellingBeeRules.get(type)!.rules;
        }
        await this.initCalendarClient()
        var eventList = (await this.calendarClient!.events.list({calendarId:calendarId})).data.items
        var now  = new Date()
        var return_value:SeasonRules|null = null;
        this.rulesThrottle.set(type, this.timeToNextSeason(eventList, now))
        for (var e of eventList!) {
            if (new Date(e.start?.dateTime?.toString()!) < now && new Date(e.end?.dateTime?.toString()!) > now) {
                var json = (await this.driveClient?.files.get({fileId:e.attachments![0].fileId!, alt:'media'}))?.data as any
                var htmlDescription = e.description!;
                while(htmlDescription.includes("<br>")) {
                    htmlDescription = htmlDescription.replace("<br>", "\n")
                }
                var match;
                while (match = htmlDescription.match("<[^>]*>")) {
                    htmlDescription = htmlDescription.replace(match[0], "")
                }
                var description = htmlDescription?.split("#####")
                return_value = new SeasonRules(json, e.id!, e.summary!, description![0], description![1], new Date(e.end!.dateTime?.toString()!))
            }
        }
        if (!return_value) {
            return_value = new SeasonRules({}, "vanilla", "Tryb standardowy", "", "", null)
        }
        this.spellingBeeRules.set(type, new CachedRules(return_value, now))
        return return_value;
    }

    endSeason() {
        
    }
}

const instance = new SpellingBeeSeasonManager();
instance.getCurrentSeason().then(s => console.log(s))