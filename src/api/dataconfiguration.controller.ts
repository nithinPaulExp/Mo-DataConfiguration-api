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
