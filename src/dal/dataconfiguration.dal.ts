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
      var sql = "INSERT INTO sf_validations (name,method,type, campaign_id) VALUES ?"; 
      var values =[];
      for (let i=0;i<validations.length;i++){
        var validation =validations[i];
        values.push( [`${validation.name}`,`${validation.method}`,`${validation.type}`,campaignId]);
      }
      try {
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[values]);
        if (data[0] != null && data[0].affectedRows >0){
          //insert the validation params
          var validatorValues = [];
          var sqlValidationParams = "INSERT INTO sf_validations_params (name,type, validation_id) VALUES ?"; 
          for(let i=0;i< data[0].affectedRows;i++){
            var validationId = i+ data[0].insertId;
            for(let j=0;j<validations[i].required_params.length;j++){
              var param = validations[i].required_params[j];
              validatorValues.push([`${param.name}`,`${param.type}`,validationId]);
            }
          }
          try {
            let con = await mysqlClient.getMysqlConnection();
            await con.promise().query(sqlValidationParams,[validatorValues]);

          } catch (err) {
            throw err;
        }
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }

    async createTransformations(campaignId , transformations) {
      var sql = "INSERT INTO sf_transformations (name,method, campaign_id) VALUES ?"; 
      var values =[];
      for (let i=0;i<transformations.length;i++){
        var transformation =transformations[i];
        values.push( [`${transformation.name}`,`${transformation.method}`,campaignId]);
      }
      try {
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[values]);
        if (data[0] != null && data[0].affectedRows >0){
          //insert the transformation params
          var transformationValues = [];
          var sqlValidationParams = "INSERT INTO sf_transformation_params (name,type, transformation_id) VALUES ?"; 
          for(let i=0;i< data[0].affectedRows;i++){
            var tranformationId = i+ data[0].insertId;
            for(let j=0;j<transformations[i].required_params.length;j++){
              var param = transformations[i].required_params[j];
              transformationValues.push([`${param.name}`,`${param.type}`,tranformationId]);
            }
          }
          try {
            let con = await mysqlClient.getMysqlConnection();
            await con.promise().query(sqlValidationParams,[transformationValues]);

          } catch (err) {
            throw err;
        }
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }

    async createDataRecords(campaignId , fields) {
      var sql = "INSERT INTO sf_dataset_fields (table_name, name, title, sf_map_name, type, campaign_id) VALUES ?"; 
      var values =[];
      var validations = [];
      var transformations = [];

      for (let i=0;i<fields.length;i++){
        var field =fields[i];
        values.push( [`${field.table}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,campaignId]);
        validations.push(field.validations);
        transformations.push(field.transforms);
      }
      try {
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[values]);
        if (data[0] != null && data[0].affectedRows >0){
          let rowCount = data[0].affectedRows;
          let dataSetId = data[0].insertId;
          if (validations.length >0){
            var sqlValidationParams = "INSERT INTO sf_dataset_fields_validations (field_id,validation_id, campaign_id) VALUES ?"; 
            var validatorRecParams = [];
            for(let i=0;i < validations.length && i < rowCount;i++){
              let dataSetRecId = dataSetId + i;
              let validationRecrds = validations[i];
              if (validationRecrds != null){
                for(let j = 0;j<validationRecrds.length;j++){
                  let validationRec = validationRecrds[j];
                  var sqlgetValidator = "Select id from sf_validations where name = ? and type=? and campaign_id = ? LIMIT 1";
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    const validator:any = await con.promise().query(sqlgetValidator,[validationRec.name, validationRec.type, campaignId]);

                    if (validator != null && validator.length >0)
                    {
                      let validatorRec = validator[0][0];
                      validatorRecParams.push([`${dataSetRecId}`,`${validatorRec.id}`,campaignId]);
                    }
                  } catch (err) {
                    throw err;
                  }
                }
              }
            }

            try {
              let con = await mysqlClient.getMysqlConnection();
              var validationRecResults = await con.promise().query(sqlValidationParams,[validatorRecParams]);
              if (validationRecResults != null && validationRecResults.length >0){
                var validationParamFields:any = validationRecResults[0];
                var validationRecRowCount =  validationParamFields.affectedRows;
                let dataSetValidationRecId = validationParamFields.insertId;
                if (validationRecRowCount >0)
                {
                  var sqlValidationParamsValues = "INSERT INTO sf_dataset_fields_validations_params (field_validation_id,param_id, value) VALUES ?"; 
                  var validatorRecParamsValues = [];
                  for(let i=0;i < validations.length && i<validationRecRowCount; i++)
                  {
                    let validationRec = validations[i];
                    if (validationRec != null){
                      for(let k = 0;k<validationRec.length;k++){
                        let validationRecrds = validationRec[k];
                        var params = validationRecrds.required_params;
                        let paramValidationId = dataSetValidationRecId + i;
                        if (params!= null && params.length >0){
                          for(let j=0;j<params.length;j++){
                            let validationParamRec = params[j];
                            var sqlWhere = " AND validation_id = (SELECT validation_id from sf_dataset_fields_validations WHERE id=? and campaign_id = ? ) "
                            var sqlgetValidatorParam = "Select id from sf_validations_params where name = ? and type=? "+sqlWhere+"LIMIT 1";
                            try {
                              let con = await mysqlClient.getMysqlConnection();
                              const validatorParams:any = await con.promise().query(sqlgetValidatorParam,[validationParamRec.name, validationParamRec.type, paramValidationId, campaignId]);
        
                              if (validatorParams != null && validatorParams.length >0)
                              {
                                let validatorParamsRec = validatorParams[0][0];
                                validatorRecParamsValues.push([`${paramValidationId}`,`${validatorParamsRec.id}`,validationParamRec.value]);
                              }
                            } catch (err) {
                              throw err;
                            }
                          }
                          
                        }
                      }
                    }
                  }
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    await con.promise().query(sqlValidationParamsValues,[validatorRecParamsValues]);
                  } catch (err) {
                    throw err;
                  }
                }
              }
            } catch (err) {
              throw err;
            }
          }

          if (transformations.length >0){
            var sqltransformationParams = "INSERT INTO sf_dataset_fields_transformations (field_id,transformation_id, campaign_id) VALUES ?"; 
            var transformerRecParams = [];
            for(let i=0;i < transformations.length && i < rowCount;i++){
              let dataSetRecId = dataSetId + i;
              let transformRecrds = transformations[i];
              if (transformRecrds != null){
                for(let j = 0;j<transformRecrds.length;j++){
                  let transformRec = transformRecrds[j];
                  var sqlgetTransformer = "Select id from sf_transformations where name = ? and method=? and campaign_id = ? LIMIT 1";
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    const transformer:any = await con.promise().query(sqlgetTransformer,[transformRec.name, transformRec.method, campaignId]);

                    if (transformer != null && transformer.length >0)
                    {
                      let transformerRec = transformer[0][0];
                      transformerRecParams.push([`${dataSetRecId}`,`${transformerRec.id}`,campaignId]);
                    }
                  } catch (err) {
                    throw err;
                  }
                }
              }
            }

            try {
              let con = await mysqlClient.getMysqlConnection();
              await con.promise().query(sqltransformationParams,[transformerRecParams]);
            } catch (err) {
              throw err;
            }
          }          
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }

   async createDataSet(campaignId,obj) {
      var hasUpdated:boolean = false;
      if (obj.validations){
        hasUpdated = await this.createValidations(campaignId,obj.validations)
      }

      if (obj.transformations){
        hasUpdated = await this.createTransformations(campaignId,obj.transformations)
      }

      if (obj.fields && obj.fields.length >0)
      {       
        //create the data set 
        hasUpdated = await this.createDataRecords (campaignId, obj.fields);
      }
      return hasUpdated;
    };

    async getDataSet(campaignId): Promise<Array<any> > {
      let con = await mysqlClient.getMysqlConnection();       
      var sql = "CALL getDataSetConfiguration(?)";
      const datasetResult = await con.promise().query(sql,[campaignId]);    
      var datasetJson:any = {validations:[], transformations:[], fields:[]}
          
      if (datasetResult!= null && datasetResult.length >0 )
      {
         var validations = datasetResult[0][0];
         var transformations = datasetResult[0][1];
         //var fields = datasetResult[0][2];
         datasetJson.validations = await this.constructValidations(validations);        
         datasetJson.transformations= await this.constructTransformations(transformations);        
        //datasetJson.fields = await this.constructDataSet(fields);
          return datasetJson;
      }
      return null;
  }

  async constructValidations(validations) {
    var validationsArr = [];
    if (validations)
    {
      for(let i=0;i<validations.length;i++){
        var rec = validations[i];
        let validationObj =  this.findElementInArray(validationsArr,rec.validation_id);
        if (!validationObj) {
          validationObj = {
            id: rec.validation_id,
            name: rec.validation_name,
            method : rec.validation_method,
            type : rec.validation_type,
            required_params :[]
          }
          validationsArr.push(validationObj);
        }
        // Add params to the obj
        validationObj.required_params.push({name:rec.validation_param_name, type: rec.validation_param_type});
      }
    }
    return validationsArr;
  }

  async constructTransformations(transformations) {
    var transformationsArr = [];
    if (transformations)
    {
      for(let i=0;i<transformations.length;i++){
        var rec = transformations[i];
        let trnsformationObj =  this.findElementInArray(transformationsArr,rec.transformation_id);
        if (!trnsformationObj) {
          trnsformationObj = {
            id: rec.transformation_id,
            name: rec.transformation_name,
            method : rec.transformation_method,
            required_params :[]
          }
          
          transformationsArr.push(trnsformationObj);
        }
        // Add params to the obj
        trnsformationObj.required_params.push({name:rec.transform_param_name, type: rec.transform_param_type});
      }
    }
    return transformationsArr;
  }

  async constructDataSet(dataset:any) {
    // var datasetJson:any = {validations:[], transformations:[], fields:[]}
    // if (dataset)
    // {
    //   for(let i=0;i<dataset.length;i++){
    //     var rec = dataset[i];
    //     let validationObj =  this.findElementInArray(datasetJson.validations,rec.validation_id);
    //     if (!validationObj){
    //       validationObj = {
    //         name: rec.validation_name,
    //         method : rec.validation_method,
    //         type : rec.validation_type
    //       }
    //     }
    //   }
    //     dataset.forEach(rec => {
    //         let validationObj =  this.findElementInArray(datasetJson.validations,rec.id);
    //         if (!validationObj)
    //         {
    //             let validationObj = {
    //                 name: rec.validation_name,
    //                 method : rec.validation_method,
    //                 type : rec.validation_type,

    //             }
    //             datasetJson.validations.push(validationObj);
    //         }
    //     });
    // }
    return {};
  }
  findElementInArray (array:Array<any>,id:Number)
  { let obj = null;
      array.find(function(elem)
      {
          if (elem.id === id)
          {
              obj = elem;
              return;
          }
      });

      if (obj)
      {
          return obj;
      }
      else 
      {
          return null;
      }
  }

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