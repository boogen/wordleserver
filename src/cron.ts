import cron from 'node-cron';
import {Client} from 'onesignal-node';  
const oneSignalClient = new Client("af840bb4-2f85-42a0-8632-a7f65367ddb5", process.env.ONE_SIGNAL_API_KEY!);
const notification = {
    template_id: "e48e3d12-7262-4464-8068-a7ab46f5bfdf",
    included_segments: ['Subscribed Users']
  };

cron.schedule('0 0 13 * * *', sendNotifications);


function sendNotifications() {
    console.log("sending notifications");
    oneSignalClient.createNotification(notification)
        .then(response => console.log(response.statusCode))
        .catch(e => console.log(e.body));
}
