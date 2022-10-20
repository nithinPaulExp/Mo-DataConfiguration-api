import 'automapper-ts';
import Campaigns from '../api-models/campaigns.api.model';
export default class Mapper {
  static async initializeMapper() {
    automapper.initialize((config: AutoMapperJs.IConfiguration) => {});
  }

  static async createMap() {
    automapper
      .createMap('CampaignsDM', Campaigns)
      .forMember('title', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('start_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('end_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('type', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('created', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('updated', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('reconfirmation_date', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.ignore())
      .forMember('campaign_id', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('id'))
      .forMember('year', (opts: AutoMapperJs.IMemberConfigurationOptions) => opts.mapFrom('short_title'));
  }
}
