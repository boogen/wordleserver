import cron from 'node-cron';
import { oneSignalClient } from './one_signal';
import { SpellingBeeSeasonManager } from './spelling_bee_season_manager';
import { inject, injectable } from 'inversify';
import { Logger } from './logger';


const daily_reminder_notification = {
    template_id: "e48e3d12-7262-4464-8068-a7ab46f5bfdf",
    included_segments: ['Subscribed Users']
  };

@injectable()
export class CronService {
  constructor(
    @inject(Logger) private logger: Logger,
    @inject(SpellingBeeSeasonManager) private seasonManager: SpellingBeeSeasonManager
  ) {
    logger.setContext("CronService");
    logger.info("Scheduling notifications sending");
    cron.schedule('0 0 11 * * *', this.sendNotifications.bind(this), {timezone: "UTC"});
    logger.info("Scheduling end of spelling bee season");
    cron.schedule('59 59 10 * * *', this.endSpellingBeeSeason.bind(this), {timezone:"UTC"})
  }


  sendNotifications() {
      this.logger.info("sending notifications");
      const logger = this.logger;
      oneSignalClient.createNotification(daily_reminder_notification)
          .then(response => logger.info(response.statusCode))
          .catch(e => logger.error(e.body));
  }

  endSpellingBeeSeason() {
    this.logger.info("ending spelling bee season");
    this.seasonManager.endSeason();
  }
}
