import { Request, Response } from 'express';
import DataConfigurationBLL from '../bll/dataconfiguration.bll';
const dataConfigurationBLL = new DataConfigurationBLL();

export const getCampaigns = async (req: Request, res: Response) => {
  const campaigns = await dataConfigurationBLL.getCampaigns();
  return res.status(200).json(campaigns);
};

export const getInitialConfiguration = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const isSync = req.query['sync'] != null && req.query['sync'] === "true";
  
  const configurations = await dataConfigurationBLL.checkInitialConfigurationExists(campaignId,isSync);
  if (configurations == null){
    return res.status(400).json({error:"Something went wrong, No Configuration found"});
  }
  return res.status(200).json(configurations);
};

export const getObjects = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const configurations = await dataConfigurationBLL.getObjects(campaignId);
  if (configurations == null){
    return res.status(400).json({error:"Something went wrong, No Configuration found"});
  }
  return res.status(200).json(configurations);
};

export const getTables = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const object = req.query['object'];
  const configurations = await dataConfigurationBLL.getTables(campaignId,object);
  if (configurations == null){
    return res.status(400).json({error:"Something went wrong, No Configuration found"});
  }
  return res.status(200).json(configurations);
};

export const getConditions = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const object = req.query['object'];
  if (object == null){
    return res.status(400).json({error:"object is missing"});
  }
  const conditions = await dataConfigurationBLL.getConditions(campaignId,object);
  if (conditions == null){
    return res.status(400).json({error:"Something went wrong, No Configuration found"});
  }
  return res.status(200).json(conditions);
};

export const generateData = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const object = req.query['object'];
  const request = req.body;
  if (object == null){
    return res.status(400).json({error:"object is missing"});
  }
  const data = await dataConfigurationBLL.generateData(campaignId,object,request);
  if (data == null){
    return res.status(400).json({error:"Something went wrong, No Configuration found"});
  }
  if (data.errorMessage){
    return res.status(200).json(data);
  }
  return res.status(200).json(data);
};



export const createOrUpdateTable = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const dataSet = req.body;
  const id = req.query['id'];
  var response = await dataConfigurationBLL.createOrUpdateTable(campaignId,dataSet,id)
  if (response.errorMessage){
    return res.status(400).json(response);
  }
  return res.status(200).json(response);
};  

export const deleteTable = async (req: Request, res: Response) => {
  const id = req.params['id'];
  if (id== null){
    return res.status(200).json({errorMessage:"Table Id id is missing"});
  }
  var response = await dataConfigurationBLL.deleteTable(id)
  if (response.errorMessage){
    return res.status(200).json(response);
  }
  return res.status(200).json(response);
}; 

export const updateInitialConfiguration = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    if (await dataConfigurationBLL.updateInitialConfigurations(campaignId,dataSet)){
      return res.status(200).json();
    }
    
    return res.status(400).json();
  };  

  export const createValidation = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    var response = await dataConfigurationBLL.createOrUpdateValidation(campaignId,dataSet)
    if (response.errorMessage){
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  };  

  export const updateValidation = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    const id = req.query['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"validation id is missing"});
    }
    var response = await dataConfigurationBLL.createOrUpdateValidation(campaignId,dataSet,id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 

  export const deleteValidation = async (req: Request, res: Response) => {
    const id = req.params['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"validation id is missing"});
    }
    var response = await dataConfigurationBLL.deleteValidation(id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 
  
  export const getValidations = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const validations = await dataConfigurationBLL.getValidations(campaignId);
    if (validations == null){
      return res.status(200).json({error:"Something went wrong, No validations found"});
    }
    return res.status(200).json(validations);
  };

  export const createTransformation = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    var response = await dataConfigurationBLL.createOrUpdateTransformation(campaignId,dataSet)
    if (response.errorMessage){
      return res.status(400).json(response);
    }
    return res.status(200).json(response);
  };  

  export const updateTransformation = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    const id = req.query['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"transformation id is missing"});
    }
    var response = await dataConfigurationBLL.createOrUpdateTransformation(campaignId,dataSet,id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 

  export const deleteTransformations = async (req: Request, res: Response) => {
    const id = req.params['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"transformation id is missing"});
    }
    var response = await dataConfigurationBLL.deleteTransformation(id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 
  
  export const getTransformations = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const transformations = await dataConfigurationBLL.getTransformations(campaignId);
    if (transformations == null){
      return res.status(200).json({error:"Something went wrong, No transformations found"});
    }
    return res.status(200).json(transformations);
  };

  export const getFields = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const object = req.query['object'];
    const fields = await dataConfigurationBLL.getFields(campaignId,object);
    if (fields == null){
      return res.status(200).json({error:"Something went wrong, No fields found"});
    }
    return res.status(200).json(fields);
  };


  export const createField = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    var response = await dataConfigurationBLL.createOrUpdateFields(campaignId,dataSet)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  };  

  export const updateField = async (req: Request, res: Response) => {
    const campaignId = req.params['campaignId'];
    const dataSet = req.body;
    const id = req.query['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"field id is missing"});
    }
    var response = await dataConfigurationBLL.createOrUpdateFields(campaignId,dataSet,id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 

  export const deleteField = async (req: Request, res: Response) => {
    const id = req.params['id'];
    if (id== null){
      return res.status(200).json({errorMessage:"field id is missing"});
    }
    var response = await dataConfigurationBLL.deleteField(id)
    if (response.errorMessage){
      return res.status(200).json(response);
    }
    return res.status(200).json(response);
  }; 
  