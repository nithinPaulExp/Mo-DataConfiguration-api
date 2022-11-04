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

    async getDBNameFromCampaignId(campaignId){
      var dbName = "mov_movember_com_live";
      if (!campaignId){
        return dbName;
      }
      else {
        var campaigns = await this.getCampaigns();
        var thisCampaign = campaigns.find(x=>x.id === campaignId);
        const campaignYear = thisCampaign?thisCampaign.short_title:null;
        if (thisCampaign !=null && campaignYear != null && campaignYear != null && !thisCampaign.isCurrentCampaign){
          dbName = dbName+ "_" + campaignYear;
       }
      }
      return dbName;
    }

    async getPreviousCampaignId(campaignId){
      
      var campaigns = await this.getCampaigns();
      if (!campaignId){
        return campaigns[0].id;
      }
      else {
        for(let i=0;i<campaigns.length;i++){
          if (campaigns[i].id === parseInt(campaignId)){
            return campaigns[i+1].id;
          }
        }
      }
      return null;
    }

    async generateData(campaignId, object,requestObj) {
      
      var fields = await this.getFields(campaignId,object);
      if (fields.length <=0){
        return {
          errorMessage: `No fields defined`
        };
      }
      var tables = await this.getTables(campaignId,object);
      var reqConditions = requestObj.condition;
      var fieldsList = []; 
      var fromstring;
      
      var parentTableIds=[];
      for(let i=0;i<fields.length;i++){
        var field = fields[i];
        if (!field.send_to_sf)
          continue;
        var table = tables.find(x=>x.id === field.table);
        if (!table)
          continue;
        if (i===0){
          var dbName = `${(!table.db || table.db === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):table.db}`;
          fromstring = ` FROM ${dbName}.${table.name} ${table.alias}`
          parentTableIds.push(table.id);
        }
        fieldsList.push( `${table.alias}.${field.name} ${field.alias_name?"AS "+field.default_sf_map_name:''}`);
      } 

      var query = 'SELECT '+ fieldsList.join(',') + fromstring;

      //construct relations
      var relationsQuery=[];
      var relations = await this.getRelations(campaignId,object);
      var hasReachedEnd = false;
      var joinParentTables = parentTableIds;
      var previousCampaignId = await this.getPreviousCampaignId(campaignId);
      while(!hasReachedEnd){
        parentTableIds = joinParentTables;
        joinParentTables = [];
        for(let i=0;i< parentTableIds.length;i++){
          var parentTableId = parentTableIds[i];
          var joinTables = relations.filter(x=>x.parent_table.id === parentTableId);
          for(let j=0;j<joinTables.length;j++){
            var relationRec = joinTables[j];
            var joinCondition = relationRec.additional_join_condition;
            if (relationRec.additional_join_condition){
              joinCondition = joinCondition.replace("CURRENT_CAMPAIGN",campaignId);
              joinCondition = joinCondition.replace("PREVIOUS_CAMPAIGN",previousCampaignId);
            }
            var targetTable = tables.find(x=>x.id===relationRec.target_table.id);
            var dbName = `${(!targetTable.db || targetTable.db === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):targetTable.db}`;
          
            var relQuery = `${relationRec.relation}
                              ${dbName}.${relationRec.target_table.name} ${relationRec.target_table.alias}
                              ON 
                              ${relationRec.parent_table.alias}.${relationRec.on_parent.name} =  ${relationRec.target_table.alias}.${relationRec.on_target.name}
                              ${joinCondition?joinCondition:''}`;
            relationsQuery.push(relQuery);            
            joinParentTables.push(relationRec.target_table.id);
          }
        }
        if (joinParentTables.length <= 0){
          hasReachedEnd =true;
        }
      }

      var conditionQuery=[];
      if (reqConditions && reqConditions.length >0){
        
        var conditionError='';
        var conditions = await this.getConditions(campaignId,object);
        for(let i=0;i<conditions.length;i++){
          var condition = conditions[i];
          var givenCondition = reqConditions.find(x=>x.id === condition.id);
          if (!givenCondition.value){
            conditionError += `<b>${condition.name}</b> is not provided.<br/>`
          }
          var clause = condition.where_clause.replace('?',givenCondition.value)
         
          var table = tables.find(x=>x.id===condition.table.id);
          var field = fields.find(x=>x.id===condition.field.id);
          conditionQuery.push( 
            `${table.alias}.${field.name} ${clause}`
          )
        }
        if (conditionError){
          return {
            errorMessage: conditionError
          };
        }
          
      }
      

      query = query + ((relationsQuery && relationsQuery.length >0 )? ` ${relationsQuery.join(' ')}`:'');
      query = query + ((conditionQuery && conditionQuery.length >0 )? ` WHERE ${conditionQuery.join(' AND ')}`:'');
      
      try
      {
        let con = await mysqlClient.getMysqlConnection(); 
      const objects = await con.promise().query(query);          
      if (objects!= null && objects.length >0 )
      {
        return {result:objects[0]}
      }
    }
    catch(err){
      return {
        errorMessage: `error in executing the query,${err}`
      };
    }

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

  async getRelations(campaignId,object): Promise<any > {
    var dataset:any = await this.getDataSet(campaignId,false);
    if(dataset){
      if (object && dataset.relations){
        return dataset.relations.filter(x=>x.object.id === parseInt(object));
      }
      return dataset.relations;
    }
    return dataset;
}

async getConditions(campaignId,object): Promise<any > {
  var dataset:any = await this.getDataSet(campaignId,false);
  if(dataset){
    if (object && dataset.conditions){
      return dataset.conditions.filter(x=>x.object.id === parseInt(object));
    }
    return dataset.conditions;
  }
  return dataset;
}

  async getTables(campaignId,object): Promise<any > {
    let con = await mysqlClient.getMysqlConnection(); 
    let sql = `select id,table_db as db , table_name as name,alias from sf_dataset_tables where ${object?"object_id="+object+" AND":''} campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
    const objects = await con.promise().query(sql);          
    if (objects!= null && objects.length >0 )
    {
      return objects[0]
    }
    return null;
}

async getFieldsByTable(campaignId,tableId): Promise<any > {
  let con = await mysqlClient.getMysqlConnection(); 
  let sql = `select * from sf_dataset_fields where table_id= ${tableId} AND campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
  const fields = await con.promise().query(sql);          
  if (fields!= null && fields.length >0 )
  {
    return fields[0]
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
      var sql = `Select id from sf_dataset_fields WHERE table_id=? AND name=? AND object=? AND campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
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
        var sql = `UPDATE sf_dataset_fields SET
                  table_id=?,
                  object=?,alias_name=?, name=?,
                  title=?, sf_map_name=?, type=? ,send_to_sf=?
                  WHERE campaign_id ${campaignId?' ='+campaignId:' IS NULL'} AND id= ?`; 
        let con = await mysqlClient.getMysqlConnection();
        var sendToSf = field.send_to_sf && field.send_to_sf ==="false"?0:1;
        const data:any = await con.promise().query(sql,[`${field.table}`,`${field.object}`,`${field.alias_name}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,sendToSf, id]);

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

              if (validatorRecParams.length>0)
              {
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
              if (transformerRecParams.length>0)
              {
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
          
        }
      } catch (err) {
        console.log(err);
        return false;
      }
    
    }


    async createDataRecords(campaignId , fields) {
      var objects  = await this.getObjects(campaignId);
      var sql = "INSERT INTO sf_dataset_fields (table_id, object,alias_name, name, title, sf_map_name, type,send_to_sf, campaign_id) VALUES ?"; 
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
        var tables =  await this.getTables(campaignId,fieldObject);

        var fieldtable=field.table;
        if (typeof field.table === 'object'){
          var table = tables.find(x=>(x.name === field.table.name && x.alias === field.table.alias));
           if (!table){
             return false;
           }
           fieldtable = table.id;
         }
         else {
           var isValidTable = tables.find(x=>x.id === parseInt(fieldtable));
           if (!isValidTable){
             return false;
           }
         }

         var sendToSf = field.send_to_sf && field.send_to_sf ==="false"?0:1;
        values.push( [`${fieldtable}`,`${fieldObject}`,`${field.alias_name}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,`${sendToSf}`,campaignId]);
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

            if (validatorRecParams.length>0){
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
            if (transformerRecParams.length>0){
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

    async createOrUpdateTable(campaignId, obj, tableId){
      if (!tableId){
        if (!await this.createTables(campaignId,[obj])){
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
        return await this.updateTable(campaignId,obj,tableId);
      }
    }

    async deleteTable(tableId){
      var sqlgetrelations = `Select * from sf_dataset_tables_relation where parent_table_id =${tableId} OR target_table_id= ${tableId} LIMIT 1`;
      try {
          let con = await mysqlClient.getMysqlConnection();
          const fields:any = await con.promise().query(sqlgetrelations);
          if (fields != null && fields.length >0)
          {
            let fieldsRecrds = fields[0];
            if (fieldsRecrds.length >0)
            {
              return {
                errorMessage: `You need to remove relations created for the table.`
              };
            }
          }

        var sqlgetconditions = `Select * from sf_dataset_object_conditions where table_id =${tableId} LIMIT 1`;

          const fieldsConditions:any = await con.promise().query(sqlgetconditions);
          if (fieldsConditions != null && fieldsConditions.length >0)
          {
            let fieldsRecrds = fieldsConditions[0];
            if (fieldsRecrds.length >0)
            {
              return {
                errorMessage: `You need to remove conditions created for the table.`
              };
            }
          }

          var sqlgetFields = `Select * from sf_dataset_fields where table_id =${tableId}`;

          const sfFields:any = await con.promise().query(sqlgetFields);
          if (sfFields != null && sfFields.length >0)
          {
            let fieldsRecrds = sfFields[0];
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
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }

      var sql = `DELETE FROM sf_dataset_tables WHERE id = ${tableId}`; 
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


    async updateTable(campaignId , table, tableId) {      
      var sql = `UPDATE sf_dataset_tables SET table_db= '${table.table_db}', alias = '${table.alias}' ,table_name='${table.table_name}' WHERE id = ${tableId}`; 
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

    async createTables(campaignId, tables){

      if (tables.length >0){
        
        var objects  = await this.getObjects(campaignId);
        var sql = "INSERT INTO sf_dataset_tables (object_id,table_db,table_name, alias,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<tables.length;i++){
          var table =tables[i];
          var fieldObject = table.object;
          if (typeof table.object === 'object'){
            var object = objects.find(x=>x.name === table.object.name);
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
          values.push( [`${fieldObject}`,`${table.table_db}`,`${table.table_name}`,`${table.alias}`,campaignId]);
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
      return true;
    }

   async createDataSet(campaignId,obj) {
      var hasUpdated:boolean = false;

      if (obj.objects){
        hasUpdated = await this.createObjects(campaignId,obj.objects)
      }

      if (obj.tables){
        hasUpdated = await this.createTables(campaignId,obj.tables)
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

      if (obj.relations){
        hasUpdated = await this.createTableRelations(campaignId,obj.relations)
      }
      if (obj.conditions){
        hasUpdated = await this.createConditions(campaignId,obj.conditions)
      }
      return hasUpdated;
    };

    async createTableRelations(campaignId, relations){
      if (relations.length >0){
        var objects  = await this.getObjects(campaignId);       


        var sql = "INSERT INTO sf_dataset_tables_relation (parent_table_id,target_table_id,relation,on_parent,on_target,additional_join_condition,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<relations.length;i++){
          var relation = relations[i];
          var fieldObject = relation.object;
        if (typeof relation.object === 'object'){
         var object = objects.find(x=>x.name === relation.object.name);
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
        
        var tables =  await this.getTables(campaignId,fieldObject);
        var fieldParentTable=relation.parent_table;
        if (typeof relation.parent_table === 'object'){
          var table = tables.find(x=>(x.name === relation.parent_table.name && x.alias === relation.parent_table.alias));
           if (!table){
             return false;
           }
           fieldParentTable = table.id;
         }
         else {
           var isValidTable = tables.find(x=>x.id === parseInt(fieldParentTable));
           if (!isValidTable){
             return false;
           }
         }

         var fieldTargetTable=relation.target_table;
        if (typeof relation.target_table === 'object'){
          var table = tables.find(x=>(x.name === relation.target_table.name && x.alias === relation.target_table.alias));
           if (!table){
             return false;
           }
           fieldTargetTable = table.id;
         }
         else {
           var isValidTable = tables.find(x=>x.id === parseInt(fieldTargetTable));
           if (!isValidTable){
             return false;
           }
         }

         var parentFields = await this.getFieldsByTable(campaignId,fieldParentTable);

         var fieldParentField=relation.on_parent;
        if (typeof relation.on_parent === 'object'){
          var field = parentFields.find(x=>(x.name === relation.on_parent.name));
           if (!field){
             return false;
           }
           fieldParentField = field.id;
         }
         else {
           var isValidTable = parentFields.find(x=>x.id === fieldParentField);
           if (!isValidTable){
             return false;
           }
         }

         var targetFields = await this.getFieldsByTable(campaignId,fieldTargetTable);

        var fieldTargetField=relation.on_target;
        if (typeof relation.on_target === 'object'){
          var field = targetFields.find(x=>(x.name === relation.on_target.name));
           if (!field){
             return false;
           }
           fieldTargetField = field.id;
          }
          else {
           var isValidTable = targetFields.find(x=>x.id === fieldTargetField);
           if (!isValidTable){
             return false;
           }
          }
          values.push( [`${fieldParentTable}`,`${fieldTargetTable}`,`${relation.relation}`,`${fieldParentField}`,`${fieldTargetField}`,`${relation.additional_join_condition}`,campaignId]);
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
      return true;
    }

    async createConditions(campaignId, conditions){
      if (conditions.length >0){
        var objects  = await this.getObjects(campaignId);       


        var sql = "INSERT INTO sf_dataset_object_conditions (name,object_id,table_id,where_field,where_clause,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<conditions.length;i++){
          var condition = conditions[i];
          var conditionObject = condition.object;
        if (typeof condition.object === 'object'){
          var object = objects.find(x=>x.name === condition.object.name);
          if (!object){
            return false;
          }
          conditionObject = object.id;
        }
        else {
          var isValidObject = objects.find(x=>x.id === conditionObject);
          if (!isValidObject){
            return false;
          }
        }
        
        var tables =  await this.getTables(campaignId,conditionObject);
        var conditionTable=condition.table;
        if (typeof condition.table === 'object'){
          var table = tables.find(x=>(x.name === condition.table.name && x.alias === condition.table.alias));
           if (!table){
             return false;
           }
           conditionTable = table.id;
         }
         else {
           var isValidTable = tables.find(x=>x.id === parseInt(conditionTable));
           if (!isValidTable){
             return false;
           }
         }

         var fields = await this.getFieldsByTable(campaignId,conditionTable);

         var conditionField=condition.field;
        if (typeof condition.field === 'object'){
          var field = fields.find(x=>(x.name === condition.field.name));
           if (!field){
             return false;
           }
           conditionField = field.id;
         }
         else {
           var isValidTable = fields.find(x=>x.id === conditionField);
           if (!isValidTable){
             return false;
           }
         }

          values.push( [`${condition.name}`,`${conditionObject}`,`${conditionTable}`,`${conditionField}`,`${condition.where_clause}`,campaignId]);
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
      return true;
    }

    async createObjects(campaignId, objects){

      if (objects.length >0){
        
        var sql = "INSERT INTO sf_dataset_objects (name,display_name,api_endpoint, sqs_topic_arn,key_field,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<objects.length;i++){
          var object =objects[i];
          values.push( [`${object.name}`,`${object.display_name}`,`${object.api_endpoint}`,`${object.sqs_topic_arn}`,`${object.key_field}`,campaignId]);
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
      return true;
    }

    async getFields(campaignId,object): Promise<Array<any> > {
      var dataset:any = await this.getDataSet(campaignId,false);
      if(dataset){
        if (object && dataset.fields){
          return dataset.fields.filter(x=>x.object === parseInt(object));
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
        var tables = datasetResult[0][4];
        var relations = datasetResult[0][5];
        var conditions = datasetResult[0][6];
        if ((validations == null || validations.length == 0 )&& (transformations == null || transformations.length == 0) && (fields == null || fields.length == 0)){
          return null;
        }
        var validationArray = await this.constructValidations(validations);      
        datasetJson.validations = validationArray;  
        var transformationArray = await this.constructTransformations(transformations);    
        datasetJson.transformations  =transformationArray;        
        var objectArr = await this.constructObjects(objects);    
        datasetJson.objects  =objectArr;  

        var tableArr = await this.constructTables(tables,objectArr);    
        datasetJson.tables  =tableArr;       

        var fieldArr =  await this.constructDataSet(fields,validationArray,transformationArray);
        datasetJson.fields =fieldArr;
        datasetJson.conditions  =await this.constructConditions(conditions,objectArr ,tableArr, fieldArr);
        datasetJson.relations = await this.constructRelations(relations,tableArr, fieldArr);

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
            delete datasetJson.fields[i].table_name;
            var obj = objectArr.find(x=>x.id === parseInt( datasetJson.fields[i].object));
            var recObj = {name:''}
            if (obj){
              recObj.name = obj.name
              datasetJson.fields[i].object = recObj;
            }
            

            var table = tableArr.find(x=>x.id === parseInt( datasetJson.fields[i].table));
            var recTable = {name:'',alias:''};
            if (table){
              recTable.name = table.table_name
              recTable.alias = table.alias
              datasetJson.fields[i].table = recTable;
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
          
          for(let i=0;i< datasetJson.tables.length;i++){
            delete datasetJson.tables[i].id;
            delete datasetJson.tables[i].object.id;
          }

          for(let i=0;i< datasetJson.relations.length;i++){
            delete datasetJson.relations[i].id;
            delete datasetJson.relations[i].object.id;
            delete datasetJson.relations[i].parent_table.id;
            delete datasetJson.relations[i].target_table.id;
            delete datasetJson.relations[i].on_parent.id;
            delete datasetJson.relations[i].on_target.id;
          }
          for(let i=0;i< datasetJson.conditions.length;i++){
            delete datasetJson.conditions[i].id;
            delete datasetJson.conditions[i].object.id;
            delete datasetJson.conditions[i].table.id;
            delete datasetJson.conditions[i].field.id;
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

  async constructTables(tables,objects) {
    var tablArr = [];
    if (tables && tables.length >0)
    {
      for(let i=0;i<tables.length;i++){
        var rec = tables[i];
        let tableRec =  this.findElementInArray(tablArr,rec.id);
        if (!tableRec) {
          let paramObj = this.findElementInArray(objects,rec.object_id);
          if (paramObj)
          {
            tableRec = {
              id :rec.id,
              object:{id: rec.object_id, name:paramObj.name},
              table_db:rec.table_db,
              table_name:rec.table_name,
              alias:rec.alias
            }
            tablArr.push(tableRec);
          }
        }
      }
    }
    return tablArr;
  }

  async constructRelations(relations,tableArr, fieldArr) {
    var relationArr = [];
    if (relations && relations.length >0)
    {
      for(let i=0;i<relations.length;i++){
        var rec = relations[i];
        let relationRec =  this.findElementInArray(relationArr,rec.id);
        if (!relationRec) {
          relationRec = {
            id:rec.id,
            object:{id:"", name:""},
            parent_table:{id:"", name:"",alias:""},
            target_table:{id:"", name:"",alias:""},
            on_parent: {
              id:"",
              name: ""
            },
            on_target: {id:"",
              name: ""
            },
            relation: rec.relation,
            additional_join_condition:rec.additional_join_condition
          } 
          let parenttableRec = this.findElementInArray(tableArr,rec.parent_table_id);
          if (parenttableRec)
          {
            relationRec.parent_table.id = rec.parent_table_id;
            relationRec.parent_table.name = parenttableRec.table_name;
            relationRec.parent_table.alias= parenttableRec.alias;
            relationRec.object = parenttableRec.object
          }

          let targettableRec = this.findElementInArray(tableArr,rec.target_table_id);
          if (targettableRec)
          {
            relationRec.target_table.id = rec.target_table_id;
            relationRec.target_table.name = targettableRec.table_name;
            relationRec.target_table.alias= targettableRec.alias;
          }
          
          let parentFieldRec = this.findElementInArray(fieldArr,rec.on_parent);
          if (parentFieldRec)
          {
            relationRec.on_parent.id = rec.on_parent;
            relationRec.on_parent.name = parentFieldRec.name;
          }

          let targetFieldRec = this.findElementInArray(fieldArr,rec.on_target);
          if (targetFieldRec)
          {
            relationRec.on_target.id = rec.on_target;
            relationRec.on_target.name = targetFieldRec.name;
          }
          relationArr.push(relationRec);
        }
      }
    }
    return relationArr;
  }
  
  async constructConditions(conditions,objectArr ,tableArr, fieldArr) {
    var conditionsArr = [];
    if (conditions && conditions.length >0)
    {
      for(let i=0;i<conditions.length;i++){
        var rec = conditions[i];
        let conditionRec =  this.findElementInArray(conditionsArr,rec.id);
        if (!conditionRec) {
          conditionRec = {
            id:rec.id,
            name:rec.name,
            object:{id:"",name:""},
            table:{id:"", name:"",alias:""},
            field:{id:"", name:""},
            where_clause: rec.where_clause
          } 
          let obj = this.findElementInArray(objectArr,rec.object_id);
          if (obj)
          {
            conditionRec.object.id=rec.object_id;
            conditionRec.object.name=obj.name;
          }

          let tableRec = this.findElementInArray(tableArr,rec.table_id);
          if (tableRec)
          {
            conditionRec.table.id = rec.table_id;
            conditionRec.table.name = tableRec.table_name;
            conditionRec.table.alias= tableRec.alias;
          }

          let fieldRec = this.findElementInArray(fieldArr,rec.where_field);
          if (fieldRec)
          {
            conditionRec.field.id = rec.where_field;
            conditionRec.field.name = fieldRec.name;
          }

          conditionsArr.push(conditionRec);
        }
      }
    }
    return conditionsArr;
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
            sqs_topic_arn:rec.sqs_topic_arn,
            key_field:rec.key_field
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
            table_name:rec.table_name,
            name: rec.field_name,
            title:rec.field_title ,
            type: rec.field_type,
            object: rec.object,
            object_name:rec.object_name,
            alias_name:rec.alias_name,
            default_sf_map_name: rec.field_sf_map,
            send_to_sf: rec.send_to_sf===1?true:false,
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