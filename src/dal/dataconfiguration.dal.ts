import CampaignDM from '../models/campaignDM.model';
import mysqlClient from '../services/mysqlclient';

export default class DataCofigurationDAL {
    async getCampaigns(): Promise<Array<CampaignDM> > {
        let con = await mysqlClient.getMysqlConnection(); 
        let sql = `select * from campaign order by short_title DESC`;
        const camnpaigns = await con.promise().query(sql);          
        if (camnpaigns!= null && camnpaigns.length >0 )
        {
           const campaignData: Array<CampaignDM> = await this.constructUserDataFromUser(camnpaigns[0]);
        return campaignData
        }
        return null;
    }

    async getObjects(campaignId): Promise<any > {
      let con = await mysqlClient.getMysqlConnection(); 
      let sql = `select * from sf_dataset_objects where campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
      const objects = await con.promise().query(sql);          
      if (objects!= null && objects.length >0 )
      {
        return objects[0]
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
            if (validations[i].required_params){
              for(let j=0;j<validations[i].required_params.length;j++){
                var param = validations[i].required_params[j];
                validatorValues.push([`${param.name}`,`${param.type}`,validationId]);
              }
            }
          }
          if (validatorValues)
          {
            try {
              let con = await mysqlClient.getMysqlConnection();
              await con.promise().query(sqlValidationParams,[validatorValues]);

              } catch (err) {
                if (err.code != "ER_DUP_ENTRY"){
                  throw err;;
                }
            }
          }
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }
    
    async updateValidations(campaignId , validation, validationId) {
      var sqlgetValidator = `Select * from sf_validations where campaign_id ${campaignId?' ='+campaignId:' IS NULL'} AND id= ${validationId} LIMIT 1`;
      try {
        let con = await mysqlClient.getMysqlConnection();
        const validator:any = await con.promise().query(sqlgetValidator);

        if (validator != null && validator.length >0 && validator[0][0] != null)
        {
          let validatorRec = validator[0][0];
          if (validatorRec.type != validation.type){
            var sqlGetFields = `Select sfdf.id,sfdf.name, sfdf.table_name from sf_dataset_fields sfdf 
                                inner join sf_dataset_fields_validations sfdfv
                                on sfdf.id = sfdfv.field_id
                                WHERE sfdfv.validation_id = ${validationId}`
            const fields:any = await con.promise().query(sqlGetFields);
            if (fields != null && fields.length >0)
            {
              let fieldsRecrds = fields[0];
              if (fieldsRecrds.length >0)
              {
                var fieldString = "<ul>";
                for(let i=0;i<fieldsRecrds.length; i++){
                  fieldString += "<li key='"+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].table_name +' - '+fieldsRecrds[i].object+"</b></li>";
                }
                fieldString += "</ul>";
                return {
                  errorMessage: `You need to remove validations from the fields to update the type.<br/>
                                <b>Fields are (Field Name - Table Name - Object)</b> <br/>${fieldString}`
                };
              }
            }
            
          }
        }
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
      var sql = `UPDATE sf_validations SET name= '${validation.name}', method='${validation.method}' WHERE id = ${validationId}`; 
      try {
        let con = await mysqlClient.getMysqlConnection();
        await con.promise().query(sql);        
        return {success:true};
      } catch (err) {
          return {
            errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
          }
      }
    }

    async deleteValidation(validationId) {
      var sqlgetValidator = `Select * from sf_validations where id= ${validationId} LIMIT 1`;
      try {
        let con = await mysqlClient.getMysqlConnection();
        const validator:any = await con.promise().query(sqlgetValidator);

        if (validator != null && validator.length >0 && validator[0].length >0)
        {
          var sqlGetFields = `Select sfdf.id,sfdf.name, sfdf.table_name from sf_dataset_fields sfdf 
                              inner join sf_dataset_fields_validations sfdfv
                              on sfdf.id = sfdfv.field_id
                              WHERE sfdfv.validation_id = ${validationId}`
          const fields:any = await con.promise().query(sqlGetFields);
          if (fields != null && fields.length >0)
          {
            let fieldsRecrds = fields[0];
            if (fieldsRecrds.length >0)
            {
              var fieldString = "<ul>";
              for(let i=0;i<fieldsRecrds.length; i++){
                fieldString += "<li key ='"+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].table_name +' - '+fieldsRecrds[i].object+"</b></li>";
              }
              fieldString += "</ul>";
              return {
                errorMessage: `You need to remove validations from the fields to delete the validation.<br/>
                              <b>Fields are (Field Name - Table Name - Object)</b> <br/>${fieldString}`
              };
            }
          }
        }
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
      var sql = `DELETE FROM sf_validations WHERE id = ${validationId}`; 
      try {
        let con = await mysqlClient.getMysqlConnection();
        await con.promise().query(sql);        
        return {success:true};
      } catch (err) {
          return {
            errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
          }
      }
    }

    
    async updateTransformations(campaignId , transformation, transformationId) {
      var sql = `UPDATE sf_transformations SET name= '${transformation.name}', method='${transformation.method}' WHERE id = ${transformationId}`; 
      try {
        let con = await mysqlClient.getMysqlConnection();
        await con.promise().query(sql);        
        return {success:true};
      } catch (err) {
          return {
            errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
          }
      }
    }

    async deleteTransformation(transformationId) {
      var sqlgetTransformer = `Select * from sf_transformations where id= ${transformationId} LIMIT 1`;
      try {
        let con = await mysqlClient.getMysqlConnection();
        const transformations:any = await con.promise().query(sqlgetTransformer);

        if (transformations != null && transformations.length >0 && transformations[0].length >0)
        {
          var sqlGetFields = `Select  sfdf.id ,sfdf.name, sfdf.table_name from sf_dataset_fields sfdf 
                              inner join sf_dataset_fields_transformations sfdft
                              on sfdf.id = sfdft.field_id
                              WHERE sfdft.transformation_id = ${transformationId}`
          const fields:any = await con.promise().query(sqlGetFields);
         
          if (fields != null && fields.length >0)
          {
            let fieldsRecrds = fields[0];
            if (fieldsRecrds.length >0)
            {
              var fieldString = "<ul>";
              for(let i=0;i<fieldsRecrds.length; i++){
                fieldString += "<li key="+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].table_name +' - '+fieldsRecrds[i].object+"</b></li>";
              }
              fieldString += "</ul>";
              return {
                errorMessage: `You need to remove transformation from the fields to delete the transformation.<br/>
                              <b>Fields are (Field Name - Table Name - Object)</b> <br/>${fieldString}`
              };

            }
          }
        }
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
      var sql = `DELETE FROM sf_transformations WHERE id = ${transformationId}`; 
      try {
        let con = await mysqlClient.getMysqlConnection();
        await con.promise().query(sql);        
        return {success:true};
      } catch (err) {
          return {
            errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
          }
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
            if (transformations[i].required_params){
              for(let j=0;j<transformations[i].required_params.length;j++){
                var param = transformations[i].required_params[j];
                transformationValues.push([`${param.name}`,`${param.type}`,tranformationId]);
              }
            }
          }

          if (transformationValues.length >0)
          {
            try {
              let con = await mysqlClient.getMysqlConnection();
              await con.promise().query(sqlValidationParams,[transformationValues]);

            } catch (err) {
              if (err.code != "ER_DUP_ENTRY"){
                throw err;;
              }
            }
          }
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }

    async createOrUpdateFields (campaignId, fields,id){
      var sql = `Select id from sf_dataset_fields WHERE table_name=? AND name=? AND object=? AND campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
      if (id){
        sql += " AND id <> "+id;
      }
      let con = await mysqlClient.getMysqlConnection();
      const data:any = await con.promise().query(sql,[fields.table, fields.name,fields.object]);
      if (data[0] != null && data[0].length >0){
        return {
          errorMessage: `The field already exists.`
        };
      }
      if (!id){
        if (! await this.createDataRecords(campaignId,[fields])){
          return {
            errorMessage: `Something went wrong!! Please try again.`
          };
        } else {
          return {
            success: true
          };
        }
      }
      else {
        if (! await this.UpdateFields(campaignId,fields,id)){
          return {
            errorMessage: `Something went wrong!! Please try again.`
          };
        } else {
          return {
            success: true
          };
        }
      }
    }

    async deleteValidationsAndTransformationsAssociatedToField (fieldId){
     try {
        await this.deleteField(fieldId,false);
        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    }
    async UpdateFields(campaignId , field, id) {
      
      if (!await this.deleteValidationsAndTransformationsAssociatedToField(id)){ 
        return false; 
      }
      try{
        var sql = `UPDATE sf_dataset_fields SET table_name=?, 
                  object=?,alias_name=?, join_type=?,join_table=?,
                  join_parent_column=?, join_target_column=?, name=?,
                  title=?, sf_map_name=?, type=? 
                  WHERE campaign_id ${campaignId?' ='+campaignId:' IS NULL'} AND id= ?`; 
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[`${field.table}`,`${field.object}`,`${field.alias_name}`,`${field.join_type}`,`${field.join_table}`,`${field.join_parent_column}`,`${field.join_target_column}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`, id]);

        if (data[0] != null && data[0].affectedRows >0){
          //clear validations and add new         
            var validations = [];
            var transformations = [];
            validations.push(field.validations);
            transformations.push(field.transforms);

            if (validations.length >0){
              var sqlValidationParams = "INSERT INTO sf_dataset_fields_validations (field_id,validation_id, campaign_id) VALUES ?"; 
              var validatorRecParams = [];
              for(let i=0;i < validations.length;i++){
                let validationRecrds = validations[i];
                if (validationRecrds != null && validationRecrds.length >0){
                  for(let j = 0;j<validationRecrds.length;j++){
                    let validationRec = validationRecrds[j];                  
                    validatorRecParams.push([`${id}`,`${validationRec.id}`,campaignId]);                  
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
                    for(let i=0;i < validations.length; i++)
                    {
                      let validationRec = validations[i];
                      if (validationRec != null && validationRec.length >0){
                        for(let k = 0;k<validationRec.length;k++){
                          let validationRecrds = validationRec[k];
                          var params = validationRecrds.required_params;
                          if (params!= null && params.length >0){
                            for(let j=0;j<params.length;j++){
                              let validationParamRec = params[j];
                              var sqlWhere = ` AND validation_id = (SELECT validation_id from sf_dataset_fields_validations WHERE id=? and campaign_id ${campaignId?' ='+campaignId:' IS NULL'} ) `;
                              var sqlgetValidatorParam = "Select id from sf_validations_params where name = ? and type=? "+sqlWhere+"LIMIT 1";
                              try {
                                let con = await mysqlClient.getMysqlConnection();
                                const validatorParams:any = await con.promise().query(sqlgetValidatorParam,[validationParamRec.name, validationParamRec.type, dataSetValidationRecId]);
          
                                if (validatorParams != null && validatorParams.length >0)
                                {
                                  let validatorParamsRec = validatorParams[0][0];
                                  validatorRecParamsValues.push([`${dataSetValidationRecId}`,`${validatorParamsRec.id}`,validationParamRec.value]);
                                }
                              } catch (err) {
                                if (err.code != "ER_DUP_ENTRY"){
                                  throw err;;
                                }
                              }
                            }
                          }                        
                          dataSetValidationRecId = dataSetValidationRecId + 1;
                        }                      
                      }
                    }
                    try {
                      let con = await mysqlClient.getMysqlConnection();
                      await con.promise().query(sqlValidationParamsValues,[validatorRecParamsValues]);
                    } catch (err) {
                      if (err.code != "ER_DUP_ENTRY"){
                        throw err;;
                      }
                    }
                  }
                }
              } catch (err) {
                if (err.code != "ER_DUP_ENTRY"){
                  throw err;;
                }
              }
            }


            if (transformations.length >0 && transformations[0].length >0){
              var sqltransformationParams = "INSERT INTO sf_dataset_fields_transformations (field_id,transformation_id, campaign_id) VALUES ?"; 
              var transformerRecParams = [];
              for(let i=0;i < transformations.length;i++){
                let transformRecrds = transformations[i];
                if (transformRecrds != null && transformRecrds.length >0){
                  for(let j = 0;j<transformRecrds.length;j++){
                    let transformRec = transformRecrds[j];
                    var sqlgetTransformer = `Select id from sf_transformations where name = ? and method=? and campaign_id ${campaignId?' ='+campaignId:' IS NULL'} LIMIT 1`;
                    try {
                      let con = await mysqlClient.getMysqlConnection();
                      const transformer:any = await con.promise().query(sqlgetTransformer,[transformRec.name, transformRec.method]);

                      if (transformer != null && transformer.length >0)
                      {
                        let transformerRec = transformer[0][0];
                        transformerRecParams.push([`${id}`,`${transformerRec.id}`,campaignId]);
                      }
                    } catch (err) {
                      if (err.code != "ER_DUP_ENTRY"){
                        throw err;;
                      }
                    }
                  }
                }
              }

              try {
                let con = await mysqlClient.getMysqlConnection();
                await con.promise().query(sqltransformationParams,[transformerRecParams]);
              } catch (err) {
                if (err.code != "ER_DUP_ENTRY"){
                  throw err;;
                }
              }
            }          
           return true;
          
        }
      } catch (err) {
        console.log(err);
        return false;
      }
    
    }


    async createDataRecords(campaignId , fields) {
      var objects  = await this.getObjects(campaignId);
      var sql = "INSERT INTO sf_dataset_fields (table_name, object,alias_name, join_type,join_table,join_parent_column, join_target_column, name, title, sf_map_name, type, campaign_id) VALUES ?"; 
      var values =[];
      var validations = [];
      var transformations = [];

      for (let i=0;i<fields.length;i++){
        var field =fields[i];
        var fieldObject = field.object;
        if (typeof field.object === 'object'){
         var object = objects.find(x=>x.name === field.object.name);
          if (!object){
            return false;
          }
          fieldObject = object.id;
        }
        else {
          var isValidObject = objects.find(x=>x.id === fieldObject);
          if (!isValidObject){
            return false;
          }
        }
        values.push( [`${field.table}`,`${fieldObject}`,`${field.alias_name}`,`${field.join_type}`,`${field.join_table}`,`${field.join_parent_column}`,`${field.join_target_column}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,campaignId]);
        validations.push(field.validations);
        transformations.push(field.transforms);
      }
      try {
        let con = await mysqlClient.getMysqlConnection();
        const data:any = await con.promise().query(sql,[values]);
        if (data[0] != null && data[0].affectedRows >0){
          let dataSetId = data[0].insertId;
          if (validations.length >0 && validations[0].length>0){
            var sqlValidationParams = "INSERT INTO sf_dataset_fields_validations (field_id,validation_id, campaign_id) VALUES ?"; 
            var validatorRecParams = [];
            for(let i=0;i < validations.length;i++){
              let dataSetRecId = dataSetId + i;
              let validationRecrds = validations[i];
              if (validationRecrds != null && validationRecrds.length >0){
                for(let j = 0;j<validationRecrds.length;j++){
                  let validationRec = validationRecrds[j];
                  var sqlgetValidator = `Select id from sf_validations where name = ? and type=? and campaign_id ${campaignId?' ='+campaignId:' IS NULL'} LIMIT 1`;
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    const validator:any = await con.promise().query(sqlgetValidator,[validationRec.name, validationRec.type]);

                    if (validator != null && validator.length >0)
                    {
                      let validatorRec = validator[0][0];
                      validatorRecParams.push([`${dataSetRecId}`,`${validatorRec.id}`,campaignId]);
                    }
                  } catch (err) {
                    if (err.code != "ER_DUP_ENTRY"){
                      throw err;;
                    }
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
                  for(let i=0;i < validations.length; i++)
                  {
                    let validationRec = validations[i];
                    if (validationRec != null && validationRec.length >0){
                      for(let k = 0;k<validationRec.length;k++){
                        let validationRecrds = validationRec[k];
                        var params = validationRecrds.required_params;
                        if (params!= null && params.length >0){
                          for(let j=0;j<params.length;j++){
                            let validationParamRec = params[j];
                            var sqlWhere = ` AND validation_id = (SELECT validation_id from sf_dataset_fields_validations WHERE id=? and campaign_id ${campaignId?' ='+campaignId:' IS NULL'} ) `;
                            var sqlgetValidatorParam = "Select id from sf_validations_params where name = ? and type=? "+sqlWhere+"LIMIT 1";
                            try {
                              let con = await mysqlClient.getMysqlConnection();
                              const validatorParams:any = await con.promise().query(sqlgetValidatorParam,[validationParamRec.name, validationParamRec.type, dataSetValidationRecId]);
        
                              if (validatorParams != null && validatorParams.length >0)
                              {
                                let validatorParamsRec = validatorParams[0][0];
                                validatorRecParamsValues.push([`${dataSetValidationRecId}`,`${validatorParamsRec.id}`,validationParamRec.value]);
                              }
                            } catch (err) {
                              if (err.code != "ER_DUP_ENTRY"){
                                throw err;;
                              }
                            }
                          }
                          
                        }
                        
                      dataSetValidationRecId = dataSetValidationRecId + 1;
                      }                      
                    }
                  }
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    await con.promise().query(sqlValidationParamsValues,[validatorRecParamsValues]);
                  } catch (err) {
                    if (err.code != "ER_DUP_ENTRY"){
                      throw err;;
                    }
                  }
                }
              }
            } catch (err) {
              if (err.code != "ER_DUP_ENTRY"){
                throw err;;
              }
            }
          }

          if (transformations.length >0 && transformations[0].length >0){
            var sqltransformationParams = "INSERT INTO sf_dataset_fields_transformations (field_id,transformation_id, campaign_id) VALUES ?"; 
            var transformerRecParams = [];
            for(let i=0;i < transformations.length;i++){
              let transformRecrds = transformations[i];
              if (transformRecrds != null && transformRecrds.length >0){
                let dataSetRecId = dataSetId + i;
                for(let j = 0;j<transformRecrds.length;j++){
                  let transformRec = transformRecrds[j];
                  var sqlgetTransformer = `Select id from sf_transformations where name = ? and method=? and campaign_id ${campaignId?' ='+campaignId:' IS NULL'} LIMIT 1`;
                  try {
                    let con = await mysqlClient.getMysqlConnection();
                    const transformer:any = await con.promise().query(sqlgetTransformer,[transformRec.name, transformRec.method]);

                    if (transformer != null && transformer.length >0)
                    {
                      let transformerRec = transformer[0][0];
                      transformerRecParams.push([`${dataSetRecId}`,`${transformerRec.id}`,campaignId]);
                    }
                  } catch (err) {
                    if (err.code != "ER_DUP_ENTRY"){
                      throw err;;
                    }
                  }
                }
              }
            }

            try {
              let con = await mysqlClient.getMysqlConnection();
              await con.promise().query(sqltransformationParams,[transformerRecParams]);
            } catch (err) {
              if (err.code != "ER_DUP_ENTRY"){
                throw err;;
              }
            }
          }          
        }
        return true;
      } catch (err) {
          console.log(err);
          return false;
      }
    }

    async getValidations(campaignId){
      var sql = `SELECT v.id as validation_id,v.name as validation_name, v.method as validation_method,v.type as validation_type
      from sf_validations v WHERE v.campaign_id${campaignId?' ='+campaignId:' IS NULL'}`;

      let con = await mysqlClient.getMysqlConnection();  
      
      const validationResult = await con.promise().query(sql);          
        if (validationResult!= null && validationResult.length >0 )
        {          
          return validationResult[0];
        }  
    }

    async getTransformations(campaignId){
      var sql = `SELECT t.id as transformation_id,t.name as transformation_name, t.method as transformation_method
      from sf_transformations t WHERE t.campaign_id${campaignId?' ='+campaignId:' IS NULL'}`;

      let con = await mysqlClient.getMysqlConnection();  
      
      const transformationResult = await con.promise().query(sql);          
        if (transformationResult!= null && transformationResult.length >0 )
        {          
          return transformationResult[0];
        }  
    }

    async createOrUpdateValidation(campaignId, obj, validationId){
      if (!validationId){
        if (!await this.createValidations(campaignId,[obj])){
          return {
            errorMessage: `Something went wrong!! Please try again.`
          };
        } else {
          return {
            success: true
          };
        }
      }
      else {
        return await this.updateValidations(campaignId,obj,validationId);
      }
    }

    async createOrUpdateTransformation(campaignId, obj, transformationId){
      if (!transformationId){
        if (!await this.createTransformations(campaignId,[obj])){
          return {
            errorMessage: `Something went wrong!! Please try again.`
          };
        } else {
          return {
            success: true
          };
        }
      }
      else {
        return await this.updateTransformations(campaignId,obj,transformationId);
      }
    }

   async createDataSet(campaignId,obj) {
      var hasUpdated:boolean = false;

      if (obj.objects){
        hasUpdated = await this.createObjects(campaignId,obj.objects)
      }

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

    async createObjects(campaignId, objects){

      if (objects.length >0){
        
        var sql = "INSERT INTO sf_dataset_objects (name,display_name,api_endpoint, sqs_topic_arn,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<objects.length;i++){
          var object =objects[i];
          values.push( [`${object.name}`,`${object.display_name}`,`${object.api_endpoint}`,`${object.sqs_topic_arn}`,campaignId]);
        }
        try {
          let con = await mysqlClient.getMysqlConnection();
          const data:any = await con.promise().query(sql,[values]);
          if (data[0] != null && data[0].affectedRows >0){
            return true;
          }
        }
        catch (err) {
          return false;
        }
      }      
    }

    async getFields(campaignId,object): Promise<Array<any> > {
      var dataset:any = await this.getDataSet(campaignId,false);
      if(dataset){
        if (object && dataset.fields){
          return dataset.fields.filter(x=>x.object === object);
        }
        return dataset.fields;
      }
      return dataset;
    }

    async deleteField(fieldId, deleteField = true) {      
      try{

        let con = await mysqlClient.getMysqlConnection();    
        var sql = "CALL deleteField(?,?)";
        await con.promise().query(sql,[fieldId,deleteField && deleteField === true?1:0]); 
        return {success:true}; 
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
    }

    async getDataSet(campaignId, trimIds = true): Promise<Array<any> > {
      let con = await mysqlClient.getMysqlConnection();       
      var sql = "CALL getDataSetConfiguration(?)";
      const datasetResult = await con.promise().query(sql,[campaignId?campaignId:null]);  
      
        
      var datasetJson:any = {objects:[], validations:[], transformations:[], fields:[]}
      if (datasetResult!= null && datasetResult.length >0 )
      {
        var validations = datasetResult[0][0];
        var transformations = datasetResult[0][1];
        var fields = datasetResult[0][2];
        var objects = datasetResult[0][3];
        if ((validations == null || validations.length == 0 )&& (transformations == null || transformations.length == 0) && (fields == null || fields.length == 0)){
          return null;
        }
        var validationArray = await this.constructValidations(validations);      
        datasetJson.validations = validationArray;  
        var transformationArray = await this.constructTransformations(transformations);    
        datasetJson.transformations  =transformationArray;        
        var objectArr = await this.constructObjects(objects);    
        datasetJson.objects  =objectArr;      

        datasetJson.fields = await this.constructDataSet(fields,validationArray,transformationArray);
        
        if (trimIds)
        {
          
          for(let i=0;i< datasetJson.validations.length;i++){
            delete datasetJson.validations[i].id;
            if (datasetJson.validations[i].required_params)
            {
              for(let j=0;j< datasetJson.validations[i].required_params.length; j++){
                delete datasetJson.validations[i].required_params[j].id;
              }
            }
          } 
          
          for(let i=0;i< datasetJson.transformations.length;i++){
            delete datasetJson.transformations[i].id;
            if (datasetJson.transformations[i].required_params)
            {
              for(let j=0;j< datasetJson.transformations[i].required_params.length; j++){
                delete datasetJson.transformations[i].required_params[j].id;
              }
            }
          } 

          for(let i=0;i< datasetJson.fields.length;i++){
            delete datasetJson.fields[i].id;
            delete datasetJson.fields[i].object_name;
            var obj = objectArr.find(x=>x.id === parseInt( datasetJson.fields[i].object));
            var recObj = {name:''}
            if (obj){
              recObj.name = obj.name
              datasetJson.fields[i].object = recObj;
            }
            if (datasetJson.fields[i].validations)
            {
              for(let j=0;j< datasetJson.fields[i].validations.length; j++){
                delete datasetJson.fields[i].validations[j].id;
              }
            }

            if (datasetJson.fields[i].transforms)
            {
              for(let j=0;j< datasetJson.fields[i].transforms; j++){
                delete datasetJson.fields[i].transforms[j].id;
              }
            }
          } 
          
          for(let i=0;i< datasetJson.objects.length;i++){
            delete datasetJson.objects[i].id;
          }
        }

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
        validationObj.required_params.push({id: rec.validation_param_id, name:rec.validation_param_name, type: rec.validation_param_type});
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
        trnsformationObj.required_params.push({id: rec.transform_param_id, name:rec.transform_param_name, type: rec.transform_param_type});
      }
    }
    return transformationsArr;
  }

  async constructObjects(objects) {
    var objArr = [];
    if (objects && objects.length >0)
    {
      for(let i=0;i<objects.length;i++){
        var rec = objects[i];
        let objRec =  this.findElementInArray(objArr,rec.id);
        if (!objRec) {
          objRec = {
            id: rec.id,
            name: rec.name,
            display_name : rec.display_name,
            api_endpoint:rec.api_endpoint,
            sqs_topic_arn:rec.sqs_topic_arn
          }
          objArr.push(objRec);
        }
      }
    }
    return objArr;
  }


  async constructDataSet(dataset:any,validations,transformations) {
    var fieldsArr = [];
    if (dataset)
    {
      for(let i=0;i<dataset.length;i++){
        var rec = dataset[i];
        let fieldObj =  this.findElementInArray(fieldsArr,rec.field_id);
        if (!fieldObj) {
          fieldObj = {
            id: rec.field_id,
            table: rec.field_table,
            name: rec.field_name,
            title:rec.field_title ,
            type: rec.field_type,
            object: rec.object,
            object_name:rec.object_name,
            alias_name:rec.alias_name,
            join_type :rec.join_type,
            join_table:rec.join_table,
            join_parent_column:rec.join_parent_column,
            join_target_column:rec.join_target_column,
            default_sf_map_name: rec.field_sf_map,
            validations:[],
            transforms:[]
          }
          
          fieldsArr.push(fieldObj);
        }
        // Add params to the obj
        let validationObj = this.findElementInArray(validations,rec.field_validation_validation_id);
        if(validationObj){
          
          let validObj = this.findElementInArray(fieldObj.validations,validationObj.id);
          if (!validObj){
            validObj = {
              id: validationObj.id,
              name: validationObj.name,
              method : validationObj.method,
              type : validationObj.type,
              required_params: []
            }
            fieldObj.validations.push(validObj);
          }
          for(let i=0;i<validationObj.required_params.length;i++){
            if (rec.field_validation_param_id == validationObj.required_params[i].id)
            {
              let paramObj = this.findElementInArray(validObj.required_params,validationObj.required_params[i].id);
              if (!paramObj)
              {
                paramObj = {
                  id:validationObj.required_params[i].id,
                  name:validationObj.required_params[i].name, 
                  type: validationObj.required_params[i].type,
                  value: rec.field_validation_value
                }
                validObj.required_params.push(paramObj);
              }
              else {
                paramObj.value = rec.field_validation_value;
              }
            }
          }  
        }

        let transformationObj = this.findElementInArray(transformations,rec.field_transform_transform_id);
        if(transformationObj){
          let obj = this.findElementInArray(fieldObj.transforms,transformationObj.id);
          if (!obj){
            delete transformationObj.required_params;  
            fieldObj.transforms.push(transformationObj);
          }
        }
      }
    }
    return fieldsArr;
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

      var currenYear = new Date().getFullYear();
        const campaignArr:CampaignDM[] = new Array<CampaignDM>();
        var lifeTimeCampaign = new CampaignDM();
        lifeTimeCampaign.title = 'Life Time';
        lifeTimeCampaign.id =null;
        lifeTimeCampaign.short_title = null;
        lifeTimeCampaign.isLifeTimeCampaign =true;
        campaignArr.push(lifeTimeCampaign);
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
                    if (campaign.short_title === currenYear){
                      campaign.isCurrentCampaign =true;
                    }
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