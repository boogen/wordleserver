import { Post, BodyProp, Route } from "tsoa";
import { injectable, inject } from "inversify";
import { Logger } from "../../../logger";
import WordleDBI from "../DBI/DBI";
import { oneSignalClient } from "../../../one_signal";

interface DebugNotifyReply {
    status: string;
    message?: string;
}

@injectable()
@Route("api/v4/debug")
export class DebugController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Logger) private logger: Logger
    ) {
        this.logger.setContext("DebugController");
    }

    @Post("notify")
    public async sendNotification(
        @BodyProp() password: string,
        @BodyProp() player_id: number,
        @BodyProp() heading: string,
        @BodyProp() message: string
    ): Promise<DebugNotifyReply> {
        if (password !== process.env.DEBUG_PASSWORD) {
            return { status: "error", message: "Invalid password" };
        }

        const notification = {
            contents: { en: message },
            headings: { en: heading },
            include_external_user_ids: [player_id.toString()]
        };

        try {
            const response = await oneSignalClient.createNotification(notification);
            this.logger.info("Debug notification sent to player %d, status: %d", player_id, response.statusCode);
            return { status: "ok" };
        } catch (e: any) {
            this.logger.error("Failed to send debug notification: %s", e.body || e.message);
            return { status: "error", message: e.body?.errors?.[0] || e.message };
        }
    }
}
