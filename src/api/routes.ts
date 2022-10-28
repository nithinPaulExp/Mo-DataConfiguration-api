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
apiRouter.delete(
  '/dataconfiguration/validations/:id?',
  asyncErrHandler(dataConfigurationController.deleteValidation),
);

apiRouter.get(
  '/dataconfiguration/validations/:campaignId?',
  asyncErrHandler(dataConfigurationController.getValidations),
);


apiRouter.post(
  '/dataconfiguration/transformation/:campaignId?',
  asyncErrHandler(dataConfigurationController.createTransformation),
);
apiRouter.put(
  '/dataconfiguration/transformation/:campaignId?',
  asyncErrHandler(dataConfigurationController.updateTransformation),
);
apiRouter.delete(
  '/dataconfiguration/transformation/:id?',
  asyncErrHandler(dataConfigurationController.deleteTransformations),
);

apiRouter.get(
  '/dataconfiguration/transformation/:campaignId?',
  asyncErrHandler(dataConfigurationController.getTransformations),
);

apiRouter.get('/dataconfiguration/campaigns', asyncErrHandler(dataConfigurationController.getCampaigns));

export default apiRouter;
