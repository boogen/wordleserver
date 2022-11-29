import mariadb, { Connection, PoolConfig } from "mariadb";

const poolConfig:PoolConfig = {host:process.env.STATS_DB_HOST, database:process.env.STATS_DB_NAME, user:process.env.STATS_DB_USER, password:process.env.STATS_DB_PASSWORD}
const _db = poolConfig.host!==undefined?mariadb.createPool(poolConfig):null;

export abstract class StatsEvent {
    getSql():string {
        return `INSERT INTO ${this.getTableName()} value (${"?, ".repeat(this.getValues().length).slice(0, -2)})`
    }
    abstract getValues():any[];
    abstract getTableName():string;
}

export class StatsDBI {
    async addStat(statEvent:StatsEvent) {
        if (_db === null) {
            return;
        }
        var conn:Connection|null = null;
        try {
            conn = await _db.getConnection();
            conn.query(statEvent.getSql(), statEvent.getValues());
        } catch (err) {
            throw err;
        } finally {
            if (conn) return conn.end();
        }
    }

}