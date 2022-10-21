import Campaigns from '../api-models/campaigns.api.model';
import DataCofigurationDAL from '../dal/dataconfiguration.dal';
var fs = require('fs');

const dataConfigurationDAL = new DataCofigurationDAL();

export default class DataCofigurationBLL {
  async getCampaigns(): Promise<any> {
    const campaigns = await dataConfigurationDAL.getCampaigns();
    return automapper.map('CampaignsDM', Campaigns, campaigns);
  }

  async checkInitialConfigurationExists(campaignId,isSync): Promise<any> {
    
    let path ="assests/data.json";
    const getCurrentConfigurations = await dataConfigurationDAL.getDataSet(campaignId);
    if (getCurrentConfigurations){
      
      if (isSync){
        await fs.writeFileSync(path,JSON.stringify(getCurrentConfigurations,undefined,2));
      }
      return getCurrentConfigurations;
    }
    const data = await fs.readFileSync(path);
    return JSON.parse(data);
  }

  async updateInitialConfigurations(campaignId,obj): Promise<any> {
   if (await dataConfigurationDAL.createDataSet(campaignId,obj)){
      //update the filw with the content
      let path ="assests/data.json";
      await fs.writeFileSync(path,JSON.stringify(obj,undefined,2));
      return true;
   }
   return false;
  }

}
