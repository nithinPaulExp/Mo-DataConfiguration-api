import 'reflect-metadata';
import express = require('express');
import bodyParser = require('body-parser');
import morgan = require('morgan');
import { Express, Request, Response, NextFunction } from 'express';
import apiRouter from './api/routes';
import Mapper from './services/mapper';
var cors = require('cors');

export default class App {
  app: Express = express();
  env: string = null;
  isDevelopmentEnv: boolean = true;

  init() {
    this.env = this.app.get('env');
    this.isDevelopmentEnv = this.env === 'development';

    // Db init seems to take more time, hence
    const setUpAutoMapper = this.setupAutomapper();
    const setupExpressRoutesAndMiddlewarePromise = this.setupMiddleware()
      .then(() => this.setupRoutes())
      .then(() => this.setupErrorHandlers());

    Promise.all([setUpAutoMapper, setupExpressRoutesAndMiddlewarePromise]).then(() =>
      console.log('INIT COMPLETE'),
    );
  }

  async setupMiddleware() {    
   
    this.app.use(!this.isDevelopmentEnv?cors(this.corsOptionDelegate):cors());
    this.app.use(morgan(this.isDevelopmentEnv ? 'dev' : 'tiny'));
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.text());
    await this.setupResponseHeaders();
    console.log('NodeApplication.Init.SetupMiddleware... Success');
  }

  async setupResponseHeaders() {
    
    if (this.isDevelopmentEnv) {
      return;
    }
    this.app.use(function(req, res, next) {
    var origin=req.header('Origin')?req.header('Origin'):req.header('origin');
    if (origin){
        res.setHeader('Origin',origin);            
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Requested-With', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS,PUT, DELETE,PATCH,*');
    next();
  });
}

  corsOptionDelegate(req,callback) {
    let corsOptions;
    corsOptions = {
        origin:true,
        allowedHeaders: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
        credentials:true
    }
    callback(null, corsOptions);
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
