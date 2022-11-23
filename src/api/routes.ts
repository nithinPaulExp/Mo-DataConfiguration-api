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
  '/dataconfiguration/schema',
  asyncErrHandler(dataConfigurationController.getDatabases),
);

apiRouter.get(
  '/dataconfiguration/schema/:db/:campaignId?',
  asyncErrHandler(dataConfigurationController.getTablesFromDB),
);

apiRouter.get(
  '/dataconfiguration/schema/:db/:table/:campaignId?',
  asyncErrHandler(dataConfigurationController.getColumsInTableFromDB),
);

apiRouter.get(
  '/dataconfiguration/objects/:campaignId?',
  asyncErrHandler(dataConfigurationController.getObjects),
);
apiRouter.get(
  '/dataconfiguration/subobject/:campaignId?',
  asyncErrHandler(dataConfigurationController.getSubObjects),
);
apiRouter.get(
  '/dataconfiguration/tables/:campaignId?',
  asyncErrHandler(dataConfigurationController.getTables),
);
apiRouter.get(
  '/dataconfiguration/conditions/:campaignId?',
  asyncErrHandler(dataConfigurationController.getConditions),
);
apiRouter.get(
  '/dataconfiguration/subconditions/:campaignId?',
  asyncErrHandler(dataConfigurationController.getSubConditions),
);
apiRouter.delete(
  '/dataconfiguration/subconditions/:id',
  asyncErrHandler(dataConfigurationController.deleteSubCondition),
);
apiRouter.post(
  '/dataconfiguration/conditions/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateConditions),
);
apiRouter.post(
  '/dataconfiguration/subconditions/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateSubConditions),
);
apiRouter.delete(
  '/dataconfiguration/conditions/:id',
  asyncErrHandler(dataConfigurationController.deleteCondition),
);

apiRouter.post(
  '/dataconfiguration/generate/:campaignId?',
  asyncErrHandler(dataConfigurationController.generateData),
);
apiRouter.post(
  '/dataconfiguration/credential',
  asyncErrHandler(dataConfigurationController.saveCredential),
);
apiRouter.get(
  '/dataconfiguration/credential',
  asyncErrHandler(dataConfigurationController.getCredential),
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

apiRouter.post(
  '/dataconfiguration/object/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateObjects),
);

apiRouter.post(
  '/dataconfiguration/subobject/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateSubObjects),
);

apiRouter.get(
  '/dataconfiguration/relation/:campaignId?',
  asyncErrHandler(dataConfigurationController.getRelations),
);

apiRouter.post(
  '/dataconfiguration/relation/:campaignId?',
  asyncErrHandler(dataConfigurationController.createOrUpdateTableRelations),
);
apiRouter.delete(
  '/dataconfiguration/relation/:id',
  asyncErrHandler(dataConfigurationController.deleteTableRelations),
);

apiRouter.delete(
  '/dataconfiguration/object/:id?',
  asyncErrHandler(dataConfigurationController.deleteObject),
);

apiRouter.delete(
  '/dataconfiguration/subobject/:id?',
  asyncErrHandler(dataConfigurationController.deleteSubObject),
);
apiRouter.get('/dataconfiguration/campaigns', asyncErrHandler(dataConfigurationController.getCampaigns));

export default apiRouter;
