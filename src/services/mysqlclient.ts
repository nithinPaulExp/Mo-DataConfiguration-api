

let db = require('/opt/db.js');
export default class MysqlClient {
  _con;
  async getMysqlConnection(isreader = false) {
      try{
          if (isreader) {
              this._con = (await db.init(['reader'])).reader;
              return this._con;
          }
          else {
              this._con = (await db.init(['writer'])).writer;
              return this._con;
          }
      }
      catch(ex){
          console.log("error creating connection",ex);
          return null;
      }
  }
  async executeQuery(query, params = []) {
      return new Promise((resolve, reject) => {
          this._con.query(query, params, (error, elements) => {
              if (error) {
                  return reject(error);
              }
              return resolve(elements);
          });
      });
  }
}
