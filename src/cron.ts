import cron from 'node-cron';
import { oneSignalClient } from './one_signal';
import { getSpellingBeeSeasonManager } from './spelling_bee_season_manager';

const daily_reminder_notification = {
    template_id: "e48e3d12-7262-4464-8068-a7ab46f5bfdf",
    included_segments: ['Subscribed Users']
  };

cron.schedule('0 0 11 * * *', sendNotifications, {timezone: "UTC"});
cron.schedule('59 59 10 * * *', endSpellingBeeSeason, {timezone:"UTC"})


function sendNotifications() {
    console.log("sending notifications");
    oneSignalClient.createNotification(daily_reminder_notification)
        .then(response => console.log(response.statusCode))
        .catch(e => console.log(e.body));
}

function endSpellingBeeSeason() {
  getSpellingBeeSeasonManager().endSeason();
}
