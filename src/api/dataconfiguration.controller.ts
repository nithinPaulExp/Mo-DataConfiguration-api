import { Request, Response } from 'express';
import DataConfigurationBLL from '../bll/dataconfiguration.bll';
const dataConfigurationBLL = new DataConfigurationBLL();

export const getCampaigns = async (req: Request, res: Response) => {
  const campaigns = await dataConfigurationBLL.getCampaigns();
  return res.status(200).json(campaigns);
};

export const getInitialConfiguration = async (req: Request, res: Response) => {
  const campaignId = req.params['campaignId'];
  const configurations = await dataConfigurationBLL.checkInitialConfigurationExists(campaignId);
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
