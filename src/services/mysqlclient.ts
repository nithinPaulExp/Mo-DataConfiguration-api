import mySql from 'mysql2';

export default class MysqlClient {
  static _con: mySql.Connection;

  static hasConfigurations() {
    const configurations = ['MYSQL_HOST', 'MYSQL_USERNAME', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'MYSQL_PORT'];

    configurations.forEach(config => {
      if (!(config in process.env)) {
        throw new Error(`Environment variable ${config} is not defined.`);
      }
    });
  }

  static async getMysqlConnectionForConnectionOptions(dbConfig: mySql.ConnectionOptions) {
    // @ts-ignore: mySql.Connection._closing is not available in the type definitions.
    if (!this._con || this._con._closing || this._con.config.database !== dbConfig.database) {
      // check whether the connection alive else release connection and create new.
      if (this._con) {
        this._con.destroy();
      }

      this._con = await mySql.createConnection(dbConfig);
    }

    // check whether the connection is alive
    try {
      await this._con.promise().query(`SELECT version();`);
    } catch (ex) {
      this._con.destroy();
      this._con = await mySql.createConnection(dbConfig);
      console.log('Connection is not alive. Creatinng new connection.');
    }

    return this._con;
  }

  static async getMysqlConnection() {
    const dbConfig: mySql.ConnectionOptions = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT ? process.env.MYSQL_PORT : '3306'),
    };

    // @ts-ignore: mySql.Connection._closing is not available in the type definitions.
    if (!this._con || this._con._closing) {
      // check whether the connection alive else release connection and create new.
      if (this._con) {
        this._con.destroy();
      }

      this._con = await mySql.createConnection(dbConfig);
    }

    // check whether the connection is alive
    try {
      await this._con.promise().query(`SELECT version();`);
    } catch (ex) {
      this._con.destroy();
      this._con = await mySql.createConnection(dbConfig);
      console.log('Connection is not alive. Creatinng new connection.');
    }

    return this._con;
  }

  static format(query: string, values: any[]) {
    return mySql.format(query, values);
  }

  static escape(value: any) {
    return mySql.escape(value);
  }
}
