import {Client} from 'onesignal-node';  
export const oneSignalClient = new Client("af840bb4-2f85-42a0-8632-a7f65367ddb5", process.env.ONE_SIGNAL_API_KEY!);