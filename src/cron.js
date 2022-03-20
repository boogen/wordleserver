const cron = require('node-cron');
const oneSignal = require('onesignal-node');  
const oneSignalClient = new oneSignal.Client("af840bb4-2f85-42a0-8632-a7f65367ddb5", process.env.ONE_SIGNAL_API_KEY);
const notification = {
    contents: {
      'en': 'Sprawdź czy dasz radę je odgadnąć!'
    },
    headings: {
        "en": 'Nowe słówko dostępne'
    },
    included_segments: ['Subscribed Users']
  };

cron.schedule('0 12 0 * * *', sendNotifications);


function sendNotifications() {
    console.log("sending notifications");
    oneSignalClient.createNotification(notification)
        .then(response => console.log(response.code))
        .catch(e => console.log(e.body));
}
