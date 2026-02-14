import "reflect-metadata";
import {app} from "./app"
import { iocContainer } from "./ioc";
import { Logger } from "./logger";
require('./cron')
const port = process.env.PORT || 5000;

app.listen(port, () => {
  /* eslint-disable no-console */
  iocContainer.get<Logger>(Logger).info(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
