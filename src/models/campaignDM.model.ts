export default class CampaignDM {
  id: number;
  title: string;
  short_title: number;
  start_date: Date;
  end_date: Date;
  type: string;
  created: Date;
  updated: Date;
  reconfirmation_date: Date;
  isCurrentCampaign :boolean;
  isLifeTimeCampaign:boolean;
}
