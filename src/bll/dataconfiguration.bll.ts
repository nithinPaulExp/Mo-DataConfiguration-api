import S3Helper from '../services/s3Client';
import Campaigns from '../api-models/campaigns.api.model';
import DataCofigurationDAL from '../dal/dataconfiguration.dal';
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
        await S3Helper.uploadFile(JSON.stringify(getCurrentConfigurations,undefined,2),path);
      }
      return getCurrentConfigurations;
    }
      
    var data = await S3Helper.readS3JSONData(path);
    if (data){
      var json =  JSON.parse(data);      
      json.is_from_file=true;
      return json;
    }
    else {
      return null;
    }
  }

  async updateInitialConfigurations(campaignId,obj): Promise<any> {
   if (await dataConfigurationDAL.createDataSet(campaignId,obj)){
      return true;
   }
   return false;
  }

  async createOrUpdateValidation(campaignId,obj,validationId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateValidation(campaignId,obj,validationId);
      
  }


}
