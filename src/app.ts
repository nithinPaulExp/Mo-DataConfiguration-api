import 'reflect-metadata';
import express = require('express');
import bodyParser = require('body-parser');
import morgan = require('morgan');
import { Express, Request, Response, NextFunction } from 'express';
import apiRouter from './api/routes';
import mysqlClient from './services/mysqlclient';
import Mapper from './services/mapper';

export default class App {
  app: Express = express();
  env: string = null;
  isDevelopmentEnv: boolean = true;

  init() {
    this.env = this.app.get('env');
    this.isDevelopmentEnv = this.env === 'development';

    // Db init seems to take more time, hence
    const setUpDbConnectionPromise = this.setupDbConnection();
    const setUpAutoMapper = this.setupAutomapper();
    const setupExpressRoutesAndMiddlewarePromise = this.setupMiddleware()
      .then(() => this.setupRoutes())
      .then(() => this.setupErrorHandlers());

    Promise.all([setUpDbConnectionPromise, setUpAutoMapper, setupExpressRoutesAndMiddlewarePromise]).then(() =>
      console.log('INIT COMPLETE'),
    );
  }

  async setupMiddleware() {
    this.app.use(morgan(this.isDevelopmentEnv ? 'dev' : 'tiny'));
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.text());
    console.log('NodeApplication.Init.SetupMiddleware... Success');
  }

  async setupRoutes() {
    // console.log("NodeApplication.Init.SetupRoutes... Started");

    try {
      this.app.use('/', apiRouter);

      // If none of the routes are matched
      this.app.use(function(req: Request, res: Response, next: NextFunction) {
        const error = new Error('The requested endpoint is not found.');
        res.status(404);
        //error["status"] = 404;
        next(error);
      });
    } catch (error) {
      console.error('NodeApplication.Init.SetupRoutes... Failed', error);
    }
    console.log('NodeApplication.Init.SetupRoutes... Success');
  }

  async setupErrorHandlers() {
    // console.log("NodeApplication.Init.SetupErrorHandlers... Started");

    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Global error handler', err);

      if (this.isDevelopmentEnv) {
        res.send(err);
      } else {
        res.json({ message: err.message });
      }
    });

    console.log('NodeApplication.Init.SetupErrorHandlers... Success');
  }

  async setupDbConnection() {
    try {
      console.log('NodeApplication.Init.SetupDbConnection... Started');
      const con = await mysqlClient.getMysqlConnection();
      await con.promise().query('select 1 from campaign limit 1');
      console.log('NodeApplication.Init.SetupDbConnection... Success');
    } catch (err) {
      console.error('NodeApplication.Init.SetupDbConnection... Failed', err);
    }
  }

  async setupAutomapper() {
    try {
      console.log('NodeApplication.Init.setupAutoMapper... Started');
      Mapper.initializeMapper();
      Mapper.createMap();
    } catch (err) {
      console.error('NodeApplication.Init.setupRedis... Failed', err);
    }
  }

  getExpressApp(): Express {
    return this.app;
  }
}
