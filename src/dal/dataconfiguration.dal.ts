import CampaignDM from '../models/campaignDM.model';
import mysqlClient from '../services/mysqlclient';

export default class DataCofigurationDAL {
    async getCampaigns(): Promise<Array<CampaignDM> > {
        let con = await mysqlClient.getMysqlConnection(); 
        let sql = `select * from campaign`;
        const camnpaigns = await con.promise().query(sql);          
        if (camnpaigns!= null && camnpaigns.length >0 )
        {
           const campaignData: Array<CampaignDM> = await this.constructUserDataFromUser(camnpaigns[0]);
        return campaignData
        }
        return null;
    }

    async createValidations(campaignId , validations) {
      var sql = "INSERT INTO validations (name,method,type, campaign_id) VALUES ?"; 
      var values =[];
      for (let i=0;i<validations.length;i++){
        var validation =validations[i];
        values.push( [`'${validation.name}'`,`'${validation.method}'`,`'${validation.type}'`,campaignId]);
      }
      try {
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[values]);
        if (data[0] != null && data[0].affectedRows >0){
          //insert the validation params
          var validatorValues = [];
          var sqlValidationParams = "INSERT INTO validations_params (name,type, validation_id) VALUES ?"; 
          for(let i=0;i< data[0].affectedRows;i++){
            var validationId = i+ data[0].insertId;
            for(let j=0;j<validations[i].required_params.length;j++){
              var param = validations[i].required_params[j];
              validatorValues.push([`'${param.name}'`,`'${param.type}'`,validationId]);
            }
          }
          try {
            let con = await mysqlClient.getMysqlConnection();
            await con.promise().query(sqlValidationParams,[validatorValues]);

          } catch (err) {
            throw err;
        }
        }
      } catch (err) {
          console.log(err);
      }
    }

   async createDataSet(campaignId,obj) {
      if (obj.validations){
        await this.createValidations(campaignId,obj.validations)
      }

      if (obj.transformations){
        //this.createTransformations(campaignId,obj.transformations)
      }
    };

    async getDataSet(campaignId): Promise<Array<any> > {
      let con = await mysqlClient.getMysqlConnection(); 
      let sql = ` select df.id as field_id, df.table as field_table,df.name as field_name,df.title as field_title,df.sf_map_name as field_sf_map, df.type as field_type
                  ,v.name as validation_name, v.method as validation_method,v.type as validation_type,
                  t.name as transformation_name, t.method as transformation_method,
                  dfv.id as field_validation_id, dfv.field_id as field_validation_field_id, dfv.validation_id as field_validation_validation_id,
                  dfvp.field_validation_id as field_params_validation_id, dfvp.param_id as field_validation_param_id,dfvp.value as field_validation_value
                  ,dft.field_id as field_transform_field_id, dft.transformation_id as field_transform_id,dft.id as field_transform_id,
                  tp.transformation_id as transform_param_transformId, tp.name as transform_param_name,tp.id as transform_param_id ,tp.type as transform_param_type
                  from dataset_fields df 
                      left join dataset_fields_transformations dft
                      on df.id = dft.field_id
                      left join dataset_fields_validations dfv
                      on df.id = dfv.field_id
                      left join dataset_fields_validations_params dfvp
                      on dfv.id = dfvp.field_validation_id
                      left join validations v
                      on df.campaign_id = v.campaign_id
                      left join validations_params vp
                      on v.id = vp.validation_id
                      left join transformations t
                      on df.campaign_id = t.campaign_id
                      left join transformation_params tp
                      on t.id = tp.transformation_id`;
      if (campaignId == null){
          sql += " where df.campaign_id is null";
      }
      else {
          sql += " where df.campaign_id=?";
      }

      const campaignDataSet = await con.promise().query(sql,[campaignId]);          
      if (campaignDataSet!= null && campaignDataSet.length >0 )
      {
         //const campaignData: Array<CampaignDM> = await this.constructUserDataFromUser(campaignDataSet[0]);
          return campaignDataSet
      }
      return null;
  }

    // async constructDataSet(dataset:any) {
    // var dataset:any = {validations:[], transformations:[], fields:[]}
    //     if (dataset)
    //     {
    //         dataset.forEach(rec => {
    //             let validationObj =  this.findElementInArray(dataset.validations,rec.id);
    //             if (!validationObj)
    //             {
    //                 let validationObj = {
    //                     name: rec.validation_name,
    //                     method : rec.validation_method,
    //                     type : rec.validation_type,

    //                 }
    //                 dataset.validations.push(validationObj);
    //             }
    //         });
    //     }
    // }
    // findElementInArray (array:Array<any>,id:Number)
    // { let obj = null;
    //     array.find(function(elem)
    //     {
    //         if (elem.id === id)
    //         {
    //             obj = elem;
    //             return;
    //         }
    //     });

    //     if (obj)
    //     {
    //         return obj;
    //     }
    //     else 
    //     {
    //         return null;
    //     }
    // }

    async constructUserDataFromUser(campaigns:any): Promise<Array<CampaignDM>>{

        const campaignArr:CampaignDM[] = new Array<CampaignDM>();
        if (campaigns)
        {
            campaigns.forEach(campaignRec => {
                let campaign:CampaignDM =  this.findCampaignDataFromArray(campaignArr,campaignRec.id);
                if (!campaign)
                {
                    campaign = new CampaignDM();
                    campaign.id = campaignRec.id;
                    campaign.title = campaignRec.title;
                    campaign.short_title = campaignRec.short_title;
                    campaign.start_date = campaignRec.start_date;
                    campaign.end_date = campaignRec.end_date;
                    campaign.type = campaignRec.type;
                    campaign.created = campaignRec.created;
                    campaign.updated = campaignRec.updated;
                    campaign.reconfirmation_date = campaignRec.reconfirmation_date;
                    campaignArr.push(campaign);
                }
            });
        }
        return campaignArr;
    }

 findCampaignDataFromArray (campaignArray:Array<CampaignDM>,id:Number)
    {
        let campaignObj:CampaignDM = null;
        campaignArray.find(function(elem)
        {
            if (elem.id === id)
            {
                campaignObj = elem;
                return;
            }
        });

        if (campaignObj)
        {
            return campaignObj;
        }
        else 
        {
            return null;
        }
    }
}