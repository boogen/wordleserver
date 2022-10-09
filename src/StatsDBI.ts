import mariadb, { Connection, PoolConfig } from "mariadb";

const poolConfig:PoolConfig = {host:"127.0.0.1", database:process.env.STATS_DB}
const _db = mariadb.createPool(poolConfig);

export abstract class StatsEvent {
    getSql():string {
        return `INSERT INTO ${this.getTableName()} value (${"?, ".repeat(this.getValues().length).slice(0, -2)})`
    }
    abstract getValues():any[];
    abstract getTableName():string;
}

export class StatsDBI {
    async addStat(statEvent:StatsEvent) {
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