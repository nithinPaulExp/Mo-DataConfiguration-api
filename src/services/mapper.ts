import 'automapper-ts';
import Campaigns from '../api-models/campaigns.api.model';
export default class Mapper {
  static async initializeMapper() {
    automapper.initialize((config: AutoMapperJs.IConfiguration) => {});
  }

  static async createMap() {
    automapper
      .createMap('CampaignsDM', Campaigns)
      .forMember('title', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('title'))
      .forMember('start_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('end_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('type', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('created', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('updated', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('reconfirmation_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('campaign_id', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('id'))
      .forMember('isCurrentCampaign', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('isCurrentCampaign'))
      .forMember('isLifeTimeCampaign', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('isLifeTimeCampaign'));
      
  }
}
