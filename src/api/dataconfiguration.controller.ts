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