import Campaigns from '../api-models/campaigns.api.model';
import DataCofigurationDAL from '../dal/dataconfiguration.dal';
const dataConfigurationDAL = new DataCofigurationDAL();

export default class DataCofigurationBLL {
  async getCampaigns(): Promise<any> {
    const campaigns = await dataConfigurationDAL.getCampaigns();
    return automapper.map('CampaignsDM', Campaigns, campaigns);
  }

  async checkInitialConfigurationExists(campaignId): Promise<any> {
    const getCurrentConfigurations = await dataConfigurationDAL.getDataSet(campaignId);
    if (getCurrentConfigurations){
      return true;
    }
    return false;
  }

  async updateInitialConfigurations(campaignId,obj): Promise<any> {
   await dataConfigurationDAL.createDataSet(campaignId,obj);
    //update the filw with the content
  }

}
