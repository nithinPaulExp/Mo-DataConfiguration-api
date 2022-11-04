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

apiRouter.get(
  '/dataconfiguration/objects/:campaignId?',
  asyncErrHandler(dataConfigurationController.getObjects),
);

apiRouter.get(
  '/dataconfiguration/tables/:campaignId?',
  asyncErrHandler(dataConfigurationController.getTables),
);
apiRouter.get(
  '/dataconfiguration/conditions/:campaignId?',
  asyncErrHandler(dataConfigurationController.getConditions),
);
apiRouter.post(
  '/dataconfiguration/generate/:campaignId?',
  asyncErrHandler(dataConfigurationController.generateData),
);



apiRouter.post(
  '/dataconfiguration/table/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateTable),
);

apiRouter.delete(
  '/dataconfiguration/table/:id?',
  asyncErrHandler(dataConfigurationController.deleteTable),
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

apiRouter.get(
  '/dataconfiguration/fields/:campaignId?',
  asyncErrHandler(dataConfigurationController.getFields),
);
apiRouter.post(
  '/dataconfiguration/fields/:campaignId?',
  asyncErrHandler(dataConfigurationController.createField),
);
apiRouter.put(
  '/dataconfiguration/fields/:campaignId?',
  asyncErrHandler(dataConfigurationController.updateField),
);

apiRouter.delete(
  '/dataconfiguration/fields/:id',
  asyncErrHandler(dataConfigurationController.deleteField),
);

apiRouter.get('/dataconfiguration/campaigns', asyncErrHandler(dataConfigurationController.getCampaigns));

export default apiRouter;
