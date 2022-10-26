import express = require('express');
import { Router } from 'express';
import * as dataConfigurationController from './dataconfiguration.controller';
const asyncErrHandler = fn => async (req, res, next) => {
  fn(req, res, next).catch(err => {
    res.status(500);
    next(err);
  });
};
// Business endpoints
const apiRouter: Router = express.Router();

apiRouter.get(
  '/dataconfiguration/getInitialConfigurations/:campaignId?',
  asyncErrHandler(dataConfigurationController.getInitialConfiguration),
);

apiRouter.post(
  '/dataconfiguration/createinitialconfigurations/:campaignId?',
  asyncErrHandler(dataConfigurationController.updateInitialConfiguration),
);
apiRouter.post(
  '/dataconfiguration/validation/:campaignId?',
  asyncErrHandler(dataConfigurationController.createValidation),
);
apiRouter.put(
  '/dataconfiguration/validation/:campaignId?',
  asyncErrHandler(dataConfigurationController.updateValidation),
);

apiRouter.get('/dataconfiguration/campaigns', asyncErrHandler(dataConfigurationController.getCampaigns));

export default apiRouter;
