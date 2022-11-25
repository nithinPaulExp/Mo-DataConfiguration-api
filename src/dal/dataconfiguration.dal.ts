import CampaignDM from '../models/campaignDM.model';
import mysqlClient from '../services/mysqlclient';
import Validators from '../helpers/validators';
import Transformers from '../helpers/transformer';

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

    async getCredential(): Promise<Array<CampaignDM> > {
      let con = await mysqlClient.getMysqlConnection(); 
      let sql = `select * from sf_credentials`;
      const cred:any = await con.promise().query(sql);          
      if (cred!= null && cred.length >0 )
      {
        return cred[0];
      }
      return null;
    }

    async saveCredential(obj) {
      let con = await mysqlClient.getMysqlConnection(); 
      let sqlGet = `select * from sf_credentials LIMIT 1`;
      const cred:any = await con.promise().query(sqlGet); 
      if (cred != null && cred.length >0 && cred[0][0] != null)
      {
        let credRec = cred[0][0];
        var sql = "UPDATE sf_credentials SET user_name=?,password=?,token=?, login_url=? WHERE id=?"; 
        try {
          let con = await mysqlClient.getMysqlConnection();
          const data:any = await con.promise().query(sql,[obj.user_name,obj.password,obj.token,obj.login_url,credRec.id]);
          if (data[0] != null && data[0].affectedRows >0){
            return {
              success: `true`
            };
          }
        }
        catch(err){
          return {
            errorMessage: `error in executing the query,${err}`
          };
        }
      } 
      else {
        var sql = "INSERT INTO sf_credentials (user_name,password,token, login_url) VALUES (?,?,?,?)"; 
        try {
          let con = await mysqlClient.getMysqlConnection();
          const data:any = await con.promise().query(sql,[obj.user_name,obj.password,obj.token,obj.login_url]);
          if (data[0] != null && data[0].affectedRows >0){
            return {
              success: `true`
            };
          }
        }
        catch(err){
          return {
            errorMessage: `error in executing the query,${err}`
          };
        }
      }
    }

    async getDbs() {
      let con = await mysqlClient.getMysqlConnection(); 
      let sql = `SELECT schema_name as name
                FROM information_schema.schemata  
                WHERE schema_name LIKE 'mov%' AND schema_name NOT LIKE '%live_%';`;
      const db = await con.promise().query(sql);          
      if (db!= null && db.length >0 )
      {
        return db[0];
      }
      return null;
  }

  async getTablesFromDB(dbName,campaignId) {
    var db = (dbName === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):dbName;
    let con = await mysqlClient.getMysqlConnection(); 
    let sql = `select table_name as name from information_schema.tables WHERE table_schema = '${db}'`;
    const tables = await con.promise().query(sql);          
    if (tables!= null && tables.length >0 )
    {
      return tables[0];
    }
    return null;
}

async getColumsInTableFromDB(dbName,tableName,campaignId) {
  var db = (dbName === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):dbName;
    
  let con = await mysqlClient.getMysqlConnection(); 

  let sql = `select column_name as name from information_schema.columns where table_name = '${tableName}' AND table_schema = '${db}'`;
  const columns = await con.promise().query(sql);          
  if (columns!= null && columns.length >0 )
  {
    return columns[0];
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
        var thisCampaign = campaigns.find(x=>x.id === parseInt(campaignId));
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
      var validations=[];
      var transformations=[]
      var parentFields = fields.filter(x=>x.sub_object === null);
      if (parentFields.length <=0){
        return {
          errorMessage: `No fields defined`
        };
      }

      var query = await this.constructQuery(parentFields,tables,campaignId,object,null,validations,transformations)
      

      var conditionQuery=[];
      if (reqConditions && reqConditions.length >0){
        
        var conditionError='';
        var conditions = await this.getConditions(campaignId,object);
        var groupByClause = null;
        for(let i=0;i<conditions.length;i++){
          var condition = conditions[i];
          var givenCondition = reqConditions.find(x=>x.id === parseInt(condition.id));
          if (!givenCondition.value){
            conditionError += `<b>${condition.name}</b> is not provided.<br/>`
          }
          var clause = condition.where_clause.replace('?',givenCondition.value)
          groupByClause = condition.group_by?condition.group_by:groupByClause;
          var table = tables.find(x=>x.id===parseInt(condition.table.id));
          var field = fields.find(x=>x.id===parseInt(condition.field.id));
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
      

      query = query + ((conditionQuery && conditionQuery.length >0 )? ` WHERE ${conditionQuery.join(' AND ')}`:'');
      query =  query + (groupByClause?` GROUP BY  ${groupByClause}`:'');
      
      try
      {
        let con = await mysqlClient.getMysqlConnection(); 
        const objects:any  = await con.promise().query(query);          
        if (objects!= null && objects.length >0 )
        {
          var errors=[];
          let resultSet = objects[0];
          if (resultSet)
          {
            if (resultSet.length >0 && (validations.length>0 || transformations.length>0))
            {
              errors = await this.applyValidatorAndTransformations(resultSet,validations,transformations);
            }
          }
          if (errors&&errors.length>0){
            return {result:objects[0], errors:errors}
          }
          // build subQueries
          var subObects:any = await this.getSubObjects(campaignId,object);
          if(subObects && subObects.length >0){  
            var previousCampaignId = await this.getPreviousCampaignId(campaignId);
            for (let j=0;j<resultSet.length;j++){
              var data = resultSet[j];
              for(let i = 0; i<subObects.length; i++){
                validations=[];
                transformations=[]
                var subFields = fields.filter(x=>x.sub_object === subObects[i].id);
                if (subFields.length <=0){
                  return {
                    errorMessage: `No fields defined`
                  };
                }
  
                var query = await this.constructQuery(subFields,tables,campaignId,null,subObects[i].id,validations,transformations);
        
                var conditions = await this.getSubObjectsConditions(campaignId,null,subObects[i].id);
                var subconditionQuery=[];
                var subGroupByClause = null;
                if (conditions && conditions.length >0){
                  for(let i=0;i<conditions.length;i++){
                    var applyCondition = null;
                    var condition = conditions[i];
                    if (condition.apply_is_data){                      
                      var applyfield = fields.find(x=>x.id===parseInt(condition.apply_table_field.id));
                      if (data[applyfield.default_sf_map_name]){
                        condition.field_where_clause = condition.field_where_clause.replace('${'+applyfield.default_sf_map_name+'}',data[applyfield.default_sf_map_name]);
                        condition.field_where_clause = condition.field_where_clause.replace('${'+applyfield.alias+'}',data[applyfield.default_sf_map_name]);
                        applyCondition = `${condition.apply_is_data_conjunction_type} (${condition.field_where_clause})`;
                      }
                    }
                    var subWhereClause = condition.where_clause;
                    subGroupByClause = condition.groupby_clause?condition.groupby_clause:subGroupByClause;
                    subWhereClause = subWhereClause.replace('${apply_condition}',applyCondition?applyCondition:'');

                    // fields mapping
                    var fieldsMapping=[];
                    for(let k=0;k<condition.fields.length;k++){
                      var Conditionfield = condition.fields[k];
                      var parentField = fields.find(x=>x.id===parseInt(Conditionfield.parent_table_field.id));
                      
                      var subTable = tables.find(x=>x.id===parseInt(Conditionfield.sub_table.id));
                      var subField = fields.find(x=>x.id===parseInt(Conditionfield.sub_table_field.id));                      
                      fieldsMapping.push( 
                        `${subTable.alias}.${subField.name} = '${data[parentField.default_sf_map_name]}'`
                      );

                    }
                    if (fieldsMapping.length >0){
                      subWhereClause = subWhereClause.replace('${field_mapping}'," AND "+fieldsMapping.join('AND'));
                    }
                    subWhereClause = subWhereClause.replace("CURRENT_CAMPAIGN",campaignId);
                    subWhereClause = subWhereClause.replace("PREVIOUS_CAMPAIGN",previousCampaignId);
                    subconditionQuery.push(subWhereClause);
                  }
                }
                query = query+ (subconditionQuery?" WHERE "+subconditionQuery.join("AND"):'' )+ (subGroupByClause?` GROUP BY  ${subGroupByClause}`:'');
                let con = await mysqlClient.getMysqlConnection(); 
                const subObjects:any  = await con.promise().query(query);          
                if (subObjects!= null && subObjects.length >0 )
                {
                  var errors=[];
                  let subQueryResult = subObjects[0];
                  if (subQueryResult)
                  {
                    if (subQueryResult.length >0 && (validations.length>0 || transformations.length>0))
                    {
                      errors = await this.applyValidatorAndTransformations(subQueryResult,validations,transformations);
                    }
                  }
                  if (errors&&errors.length>0){
                    return {result:objects[0], errors:errors}
                  }
                  
                  resultSet[j] = {...resultSet[j], ...subQueryResult}
                }
              }
            }

          }
          return {result:objects[0]}
        }
      }
      catch(err){
        return {
          errorMessage: `error in executing the query,${err}`
        };
      }

    }

    async applyValidatorAndTransformations(resultSet,validations,transformations){
      var validatorHelper = new Validators();
      var transformHelper = new Transformers();
      var errors=[];
      for(let i=0;i<resultSet.length; i++){
        var data = resultSet[i];
        for (var key of Object.keys(data)) {
          var errorArr = [];
          if(validations.length>0){
            var validators = validations.find(x=>x.field === key);
            if (validators && validators.validations && validators.validations.length >0){
              for(let j=0;j<validators.validations.length;j++){
                var validator = validators.validations[j];
                if (typeof validatorHelper[validator.method] == 'function') { 
                  var resp =  await validatorHelper[validator.method](data[key],validator.required_params);
                  if (resp.error) {
                    errorArr.push({field:key,error:resp.error});
                  }
                }                        
              }
              
            }
          }
          if(transformations.length>0){
            var transformers = transformations.find(x=>x.field === key);
            if (transformers && transformers.transformations && transformers.transformations.length >0){
              for(let j=0;j<transformers.transformations.length;j++){
                var transformer = transformers.transformations[j];
                if (typeof transformHelper[transformer.method] == 'function') { 
                  data[key] = await transformHelper[transformer.method](data[key]); 
                }
                
              }
              
            }
          }
          if (errorArr && errorArr.length >0){
            errors.push({key:i,errors:errorArr});
          }
        }
      }
      return errors;
    }
    async constructQuery(fields,tables,campaignId,object,subObject, validations,transformations){
      
      var fieldsList = []; 
      var fromstring;
      
      var parentTableIds=[];
      for(let i=0;i<fields.length;i++){
        var field = fields[i];
        var table = tables.find(x=>x.id === parseInt(field.table));
        if (!table)
          continue;
        if (table.is_main_table === 1 && parentTableIds.indexOf(table.id)=== -1){
          var dbName = `${(!table.db || table.db === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):table.db}`;
          fromstring = ` FROM ${dbName}.${table.name} ${table.alias}`
          parentTableIds.push(table.id);
        }
        if (!field.send_to_sf)
          continue;
        if (field.validations && field.validations.length >0)
        {
          validations.push({field:field.default_sf_map_name,validations:field.validations});
        }
        if (field.transforms && field.transforms.length >0)
        {
          transformations.push({field:field.default_sf_map_name,transformations:field.transforms});
        }
        var fieldName = field.function?`${field.function}(${table.alias}.${field.name})`:`${table.alias}.${field.name}`;
       
        if (field.function && field.function === 'GROUP_CONCAT'){
          fieldName = `${field.function}(DISTINCT ${table.alias}.${field.name})`;
        }
        fieldsList.push( `${fieldName} ${field.alias_name?"AS "+field.default_sf_map_name:''}`);
      } 

      var query = 'SELECT '+ fieldsList.join(',') + fromstring;

      //construct relations
      var relationsQuery=[];
      var relations = await this.getRelations(campaignId,object,subObject);
      var hasReachedEnd = false;
      var joinParentTables = parentTableIds;
      var previousCampaignId = await this.getPreviousCampaignId(campaignId);
      while(!hasReachedEnd){
        parentTableIds = joinParentTables;
        joinParentTables = [];
        for(let i=0;i< parentTableIds.length;i++){
          var parentTableId = parentTableIds[i];
          var joinTables = relations.filter(x=>x.parent_table.id === parseInt(parentTableId));
          for(let j=0;j<joinTables.length;j++){
            var relationRec = joinTables[j];
            var joinCondition = relationRec.additional_join_condition;
            if (relationRec.additional_join_condition){
              joinCondition = joinCondition.replace("CURRENT_CAMPAIGN",campaignId);
              joinCondition = joinCondition.replace("PREVIOUS_CAMPAIGN",previousCampaignId);
            }
            var targetTable = tables.find(x=>x.id===parseInt(relationRec.target_table.id));
            var dbName = `${(!targetTable.db || targetTable.db === 'mov_movember_com_live')?await this.getDBNameFromCampaignId(campaignId):targetTable.db}`;
          
            var relQuery = null;
            if (relationRec.target_is_constant){
              relQuery =`${relationRec.relation}
              ${relationRec.target_table.name} ${relationRec.target_table.alias}
              ON 
              ${relationRec.target_table.alias}.${relationRec.on_target.name} ${relationRec.target_table_exp?relationRec.target_table_exp:''}= ${relationRec.target_exp?relationRec.target_exp:''}
              ${joinCondition?joinCondition:''}`;
            } else {
              relQuery =`${relationRec.relation}
                ${dbName}.${relationRec.target_table.name} ${relationRec.target_table.alias}
                ON 
                ${relationRec.parent_table.alias}.${relationRec.on_parent.name} ${relationRec.parent_exp?relationRec.parent_exp:''}=  ${relationRec.target_table.alias}.${relationRec.on_target.name} ${relationRec.target_table_exp?relationRec.target_table_exp:''}
                ${joinCondition?joinCondition:''}`;
            }
            relationsQuery.push(relQuery);            
            joinParentTables.push(relationRec.target_table.id);
          }
        }
        if (joinParentTables.length <= 0){
          hasReachedEnd =true;
        }
      }

      query = query + ((relationsQuery && relationsQuery.length >0 )? ` ${relationsQuery.join(' ')}`:'');
      return query;
      
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

  async getSubObjects(campaignId,object): Promise<any > {
    var dataset:any = await this.getDataSet(campaignId,false);
    if(dataset){
      if (object && dataset.subobjects){
        return dataset.subobjects.filter(x=>x.object.id === parseInt(object));
      }
      return dataset.subobjects;
    }
    return dataset;
}

async getSubObjectsConditions(campaignId,objectId,subobjectId): Promise<any > {
  var dataset:any = await this.getDataSet(campaignId,false);
  var subCondtions = dataset.sub_conditions;
  if(dataset){
    if (objectId && dataset.sub_conditions){
      subCondtions =  dataset.sub_conditions.filter(x=>x.object.id === parseInt(objectId));
    }
    if (subobjectId && dataset.sub_conditions){
      subCondtions =  dataset.sub_conditions.filter(x=>x.sub_object.id === parseInt(subobjectId));
    }
    return subCondtions;
  }
  return subCondtions;
}

  async getSubObjectsByObjectId(objId): Promise<any > {
    let con = await mysqlClient.getMysqlConnection(); 
    let sql = `select * from sf_dataset_sub_objects where object_id  = ${objId}`;
    const objects = await con.promise().query(sql);          
    if (objects!= null && objects.length >0 )
    {
      return objects[0]
    }
    return null;
}

  async getRelations(campaignId,object,subobject=null): Promise<any > {
    var dataset:any = await this.getDataSet(campaignId,false);
    var realtions = dataset.relations;
    if(dataset){
      if (object && dataset.relations){
        realtions = dataset.relations.filter(x=>x.object.id === parseInt(object));
      }
      if (subobject && dataset.relations){
        realtions =dataset.relations.filter(x=>x.sub_object.id === parseInt(subobject));
      }
      return realtions;
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

  async getTables(campaignId,object,subObject=null): Promise<any > {
    let con = await mysqlClient.getMysqlConnection(); 
    let sql = `select id,table_db as db ,object_id, sub_object_id, table_name as name,alias,is_main_table from sf_dataset_tables where ${object?"object_id="+object+" AND":''} ${subObject?"sub_object_id="+subObject+" AND":''} campaign_id ${campaignId?' ='+campaignId:' IS NULL'}`;
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
            var sqlGetFields = `Select sfdf.id,sfdf.name from sf_dataset_fields sfdf 
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
                  fieldString += "<li key='"+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].object+"</b></li>";
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
          var sqlGetFields = `Select sfdf.id,sfdf.name from sf_dataset_fields sfdf 
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
                fieldString += "<li key ='"+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].object+"</b></li>";
              }
              fieldString += "</ul>";
              return {
                errorMessage: `You need to remove validations from the fields to delete the validation.<br/>
                              <b>Fields are (Field Name - Object)</b> <br/>${fieldString}`
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
          var sqlGetFields = `Select  sfdf.id ,sfdf.name from sf_dataset_fields sfdf 
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
                fieldString += "<li key="+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].object+"</b></li>";
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

    async deleteMappedFieldsForSubCondition (conditionId){
      var sql = `DELETE FROM sf_dataset_sub_object_conditions_fields WHERE sub_condition_id = ${conditionId}`; 
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

     async deleteSubCondition (conditionId){
      if (!await this.deleteMappedFieldsForSubCondition(conditionId)){ 
        return {
          errorMessage: `Failed to update.`            
        }
      }
      var sql = `DELETE FROM sf_dataset_sub_object_conditions WHERE id = ${conditionId}`; 
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

    async UpdateFields(campaignId , field, id) {
      
      if (!await this.deleteValidationsAndTransformationsAssociatedToField(id)){ 
        return false; 
      }
      try{
        var sql = `UPDATE sf_dataset_fields SET
                  table_id=?,
                  sql_function=?,
                  object=?,sub_object_id=?,alias_name=?, name=?,
                  title=?, sf_map_name=?, type=? ,send_to_sf=?
                  WHERE campaign_id ${campaignId?' ='+campaignId:' IS NULL'} AND id= ?`; 
        let con = await mysqlClient.getMysqlConnection();
        if (field.send_to_sf ==='true'){
          field.send_to_sf = true;
          }
          else if (field.send_to_sf==='false'){
            field.send_to_sf = false;
          }
         var sendToSf = field.send_to_sf?1:0;
        const data:any = await con.promise().query(sql,[`${field.table}`,`${field.function}`,`${field.object}`,field.sub_object,`${field.alias_name}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,sendToSf, id]);

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
      var sql = "INSERT INTO sf_dataset_fields (table_id,sql_function,sub_object_id, object,alias_name, name, title, sf_map_name, type,send_to_sf, campaign_id) VALUES ?"; 
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
          var isValidObject = objects.find(x=>x.id === parseInt(fieldObject));
          if (!isValidObject){
            return false;
          }
        }
        var fieldSubObject=null;
        if(field.sub_object){
        var subObjects  = await this.getSubObjectsByObjectId(fieldObject);
        fieldSubObject = field.sub_object;
        if (typeof field.sub_object === 'object'){
          var subobject = subObjects.find(x=>x.name === field.sub_object.name);
          if (!subobject){
            return false;
          }
          fieldSubObject = subobject.id;
        }
        else {
          var isValidSubObject = subObjects.find(x=>x.id === parseInt(fieldSubObject));
          if (!isValidSubObject){
            return false;
          }
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
         if (field.send_to_sf ==='true'){
          field.send_to_sf = true;
          }
          else if (field.send_to_sf==='false'){
            field.send_to_sf = false;
          }
         var sendToSf = field.send_to_sf?1:0;
        values.push( [`${fieldtable}`,`${field.function}`,fieldSubObject,`${fieldObject}`,`${field.alias_name}`,`${field.name}`,`${field.title}`,`${field.default_sf_map_name}`,`${field.type}`,`${sendToSf}`,campaignId]);
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
      if (obj.is_main_table ==='true'){
        obj.is_main_table = true;
      }
      else if (obj.is_main_table==='false'){
        obj.is_main_table = false;
      }
      if (obj.is_main_table) 
      {
        var subObjectQuery = '';
        if (obj.sub_object){
          subObjectQuery+= ' AND sub_object_id = '+obj.sub_object;
        }
        if (tableId){
          subObjectQuery += ` AND id <> ${tableId}`;
        }
        var sqlgetUsed = `Select * from sf_dataset_tables WHERE  is_main_table = 1  AND object_id= ${obj.object} AND campaign_id=${campaignId} `+subObjectQuery+` LIMIT 1`;
        try {
          let con = await mysqlClient.getMysqlConnection();
          const tables:any = await con.promise().query(sqlgetUsed);
  
          if (tables != null && tables.length >0 && tables[0].length >0)
          {          
              return {
                errorMessage: `Only one table can be set as main table.`
              };
          }
        } catch (err) {
          return {
            errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
          };
        }
        
      }
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

    async createOrUpdateConditions(campaignId, obj, id){
      if (!id){
        if (!await this.createConditions(campaignId,[obj])){
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
        return await this.updateConditions(campaignId,obj,id);
      }
    }
    async createOrUpdateSubConditions(campaignId, obj, id){
      if (!id){
        if (!await this.createSubConditions(campaignId,[obj])){
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
        return await this.updateSubConditions(campaignId,obj,id);
      }
    }

    async updateSubConditions(campaignId , condition, id) {
      
      if (!await this.deleteMappedFieldsForSubCondition(id)){ 
        return {
          errorMessage: `Failed to update.`            
        }
      }
        var objects  = await this.getObjects(campaignId); 
          var conditionObject = condition.object;
          
            var isValidObject = objects.find(x=>x.id === parseInt(conditionObject));
            if (!isValidObject){
              return {
                errorMessage: `Invalid object selected.`            
              }
            }
          

          var conditionSubObject = condition.sub_object;
          var subObjects  = await this.getSubObjectsByObjectId(conditionObject);
          var isValidSubObject = subObjects.find(x=>x.id === parseInt(conditionSubObject));
          if (!isValidSubObject){
            return {
              errorMessage: `Invalid sub object selected.`            
            }
          }            
          
          try {          
            if (condition.apply_is_data ==='true'){
              condition.apply_is_data = true;
              }
              else if (condition.apply_is_data==='false'){
                condition.apply_is_data = false;
              }
              var isApply =  condition.apply_is_data?1:0;
              var applyFieldSQL =condition.apply_is_data?`apply_is_data_conjunction_type=?,
              apply_table=?,apply_table_field=?,field_where_clause=?,`:'';
            var sql = `UPDATE sf_dataset_sub_object_conditions SET name=?,
            apply_is_data=?,${applyFieldSQL}
            where_clause=?,groupby_clause=? WHERE campaign_id=? AND id=?`; 
            let con = await mysqlClient.getMysqlConnection();
            var arrValues = [`${condition.name}`,`${isApply}`]
            if (condition.apply_is_data){
              arrValues.push(`${condition.apply_is_data_conjunction_type}`,`${condition.apply_table}`,`${condition.apply_table_field}`,`${condition.field_where_clause}`)
            }
            arrValues.push(`${condition.where_clause}`,`${condition.groupby_clause}`,campaignId,id);
            const data:any = await con.promise().query(sql,arrValues);
            if (data[0] != null && data[0].affectedRows >0){
              if (await this.createSubConditionMapping(id,condition,campaignId,conditionObject)){
                return {
                  success:true
                }
              };
            }
          }
          catch (err) {
            return {
              errorMessage: `something went wrong.${err}.`            
            }
          }
        }   
          

    async deleteCondition(conditionId) {     
      var sql = `DELETE FROM sf_dataset_object_conditions WHERE id = ${conditionId}`; 
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
                fieldString += "<li key='"+fieldsRecrds[i].id+"'>"+fieldsRecrds[i].name+" - <b>"+fieldsRecrds[i].object+"</b></li>";
              }
              fieldString += "</ul>";
              return {
                errorMessage: `You need to remove validations from the fields to update the type.<br/>
                              <b>Fields are (Field Name - Object)</b> <br/>${fieldString}`
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
      
      if (table.is_main_table ==='true'){
        table.is_main_table = true;
      }
      else if (table.is_main_table==='false'){
        table.is_main_table = false;
      }
      var sql = `UPDATE sf_dataset_tables SET table_db= '${table.table_db}', alias = '${table.alias}' ,table_name='${table.table_name}', is_main_table= ${table.is_main_table?1:0} WHERE id = ${tableId}`; 
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
        var sql = "INSERT INTO sf_dataset_tables (object_id,sub_object_id,table_db,table_name, alias,is_main_table,campaign_id) VALUES ?"; 
        
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
             var isValidObject = objects.find(x=>x.id === parseInt(fieldObject));
             if (!isValidObject){
               return false;
             }
           }

           var fieldSubObject=null;
           if(table.sub_object){
            var subObjects  = await this.getSubObjectsByObjectId(fieldObject);
            fieldSubObject = table.sub_object;
            if (typeof table.sub_object === 'object'){
              var subobject = subObjects.find(x=>x.name === table.sub_object.name);
              if (!subobject){
                return false;
              }
              fieldSubObject = subobject.id;
            }
            else {
              var isValidSubObject = subObjects.find(x=>x.id === parseInt(fieldSubObject));
              if (!isValidSubObject){
                return false;
              }
            }
          }          

          if (table.is_main_table ==='true'){
            table.is_main_table = true;
          }
          else if (table.is_main_table==='false'){
            table.is_main_table = false;
          }
          values.push( [`${fieldObject}`,fieldSubObject,`${table.table_db}`,`${table.table_name}`,`${table.alias}`,table.is_main_table?1:0,campaignId]);
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

    async createOrUpdateObject(campaignId,obj,id = null ){
      if (!id){
        if (! await this.createObjects(campaignId,[obj])){
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
        if (! await this.updateObject(campaignId,obj,id)){
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

    async createOrUpdateSubObject(campaignId,obj,id = null ){
      if (!id){
        if (! await this.createSubObjects(campaignId,[obj])){
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
        if (! await this.updateSubObject(campaignId,obj,id)){
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

    async createOrUpdateRelations(campaignId,obj,id = null ){
      if (!id){
        if (! await this.createTableRelations(campaignId,[obj]))
        {
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
         return await this.updateTableRelations(campaignId,obj,id)
      }
    }

    async deleteObject(objId) {
      var sqlgetUsed = `Select * from sf_dataset_tables where object_id= ${objId} LIMIT 1`;
      try {
        let con = await mysqlClient.getMysqlConnection();
        const tables:any = await con.promise().query(sqlgetUsed);

        if (tables != null && tables.length >0 && tables[0].length >0)
        {          
            return {
              errorMessage: `You need to remove all tables, relations, fields before deleting the object.`
            };
        }
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
      var sql = `DELETE FROM sf_dataset_objects WHERE id = ${objId}`; 
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
    
    async updateObject(campaignId, obj, id){
      var sql = `UPDATE sf_dataset_objects 
                SET name=?,display_name=?,api_endpoint=?, sqs_topic_arn=?,key_field=?
                WHERE campaign_id =? AND id=?`; 

      let con = await mysqlClient.getMysqlConnection();
      const data:any = await con.promise().query(sql,[`${obj.name}`,`${obj.display_name}`,`${obj.api_endpoint}`,`${obj.sqs_topic_arn}`,`${obj.key_field}`,campaignId, id]);

      if (data[0] != null && data[0].affectedRows >0){
        return true;
      } else {
        return false;
      }
    }

    async updateSubObject(campaignId,obj, id){
      
      var objects  = await this.getObjects(campaignId);
      var isValidObject = objects.find(x=>x.id === parseInt(obj.object));
      if (!isValidObject){
        return false;
      }
      if (obj.apply_on_result ==='true'){
        obj.send_to_sf = true;
        }
        else if (obj.apply_on_result==='false'){
          obj.apply_on_result = false;
        }
       var apply_on_result = obj.apply_on_result?1:0;
      var sql = `UPDATE sf_dataset_sub_objects 
                SET name=?,object_id=?,apply_on_result=?
                WHERE id=?`; 

      let con = await mysqlClient.getMysqlConnection();
      const data:any = await con.promise().query(sql,[`${obj.name}`,`${obj.object}`,`${apply_on_result}`, id]);

      if (data[0] != null && data[0].affectedRows >0){
        return true;
      } else {
        return false;
      }
    }

    async deleteSubObject(objId) {
      var sqlgetUsed = `Select * from sf_dataset_tables where sub_object_id= ${objId} LIMIT 1`;
      try {
        let con = await mysqlClient.getMysqlConnection();
        const tables:any = await con.promise().query(sqlgetUsed);

        if (tables != null && tables.length >0 && tables[0].length >0)
        {          
            return {
              errorMessage: `You need to remove all tables, relations, fields before deleting the sub object.`
            };
        }
      } catch (err) {
        return {
          errorMessage: `Something went wrong!! Please try again. \n\n error: ${err}`
        };
      }
      var sql = `DELETE FROM sf_dataset_sub_objects WHERE id = ${objId}`; 
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
   async createDataSet(campaignId,obj) {
      var hasUpdated:boolean = false;

      if (obj.objects){
        hasUpdated = await this.createObjects(campaignId,obj.objects)
      }
      if (obj.subobjects){
        hasUpdated = await this.createSubObjects(campaignId,obj.subobjects)
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

      if (obj.sub_conditions){
        hasUpdated = await this.createSubConditions(campaignId,obj.sub_conditions)
      }
      return hasUpdated;
    };

    async createTableRelations(campaignId, relations){
      if (relations.length >0){
        var objects  = await this.getObjects(campaignId);       


        var sql = `INSERT INTO sf_dataset_tables_relation 
                  (
                    sub_object_id,parent_table_id,target_table_id,relation,on_parent,on_target,
                    additional_join_condition,
                    parent_exp,
                    target_is_constant,
                    target_table_exp,
                    target_exp,
                    campaign_id
                  ) VALUES ?`; 
        
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
          var isValidObject = objects.find(x=>x.id === parseInt(fieldObject));
          if (!isValidObject){
            return false;
          }
        }
        var fieldSubObject=null;
        if(relation.sub_object){
        var subObjects  = await this.getSubObjectsByObjectId(fieldObject);
        fieldSubObject = relation.sub_object;
        if (typeof relation.sub_object === 'object'){
          var subobject = subObjects.find(x=>x.name === relation.sub_object.name);
          if (!subobject){
            return false;
          }
          fieldSubObject = subobject.id;
        }
        else {
          var isValidSubObject = subObjects.find(x=>x.id === parseInt(fieldSubObject));
          if (!isValidSubObject){
            return false;
          }
        }
      }  
        
        var tables =  await this.getTables(campaignId,fieldObject,fieldSubObject);
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

         var fieldTargetTable=null;
         if (relation.target_table){
          fieldTargetTable = relation.target_table
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
         }        

        var fieldParentField=null;
        if (relation.on_parent){
          var parentFields = await this.getFieldsByTable(campaignId,fieldParentTable);
          fieldParentField=relation.on_parent;
          if (typeof relation.on_parent === 'object'){
            var field = parentFields.find(x=>(x.name === relation.on_parent.name));
            if (!field){
              return false;
            }
            fieldParentField = field.id;
          }
          else {
            var isValidTable = parentFields.find(x=>x.id === parseInt(fieldParentField));
            if (!isValidTable){
              return false;
            }
          }
        }
         

        var fieldTargetField=null;
        if (relation.on_target )
        {
          var targetFields = await this.getFieldsByTable(campaignId,fieldTargetTable);
 
          fieldTargetField = relation.on_target;
          if (typeof relation.on_target === 'object'){
            var field = targetFields.find(x=>(x.name === relation.on_target.name));
            if (!field){
              return false;
            }
            fieldTargetField = field.id;
          }
          else {
            var isValidTable = targetFields.find(x=>x.id === parseInt(fieldTargetField));
            if (!isValidTable){
              return false;
            }
          }
        }
        if (relation.target_is_constant ==='true'){
          relation.target_is_constant = true;
          }
          else if (relation.target_is_constant==='false'){
            relation.target_is_constant = false;
          }
          var targetIsConstant =  relation.target_is_constant?1:0;
           
          values.push( [fieldSubObject,`${fieldParentTable}`,fieldTargetTable,`${relation.relation}`,fieldParentField,fieldTargetField,`${relation.additional_join_condition}`,`${relation.parent_exp}`,targetIsConstant,`${relation.target_table_exp}`,`${relation.target_exp}`,campaignId]);
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

    async updateTableRelations(campaignId, relation,id){
        var objects  = await this.getObjects(campaignId); 
        var fieldObject = relation.object;
        var isValidObject = objects.find(x=>x.id === parseInt(fieldObject));
        if (!isValidObject){
          return {
            errorMessage: `Invalid object selected.`            
          }
        }
        var fieldSubObject=null;
        if(relation.sub_object){
        var subObjects  = await this.getSubObjectsByObjectId(fieldObject);
        fieldSubObject = relation.sub_object;
        var isValidSubObject = subObjects.find(x=>x.id === parseInt(fieldSubObject));
        if (!isValidSubObject){
          return {
            errorMessage: `Invalid sub object selected.`            
          }
        }
      }  
        
        
        var tables =  await this.getTables(campaignId,fieldObject,fieldSubObject);
        var fieldParentTable=relation.parent_table;
        
          var isValidTable = tables.find(x=>x.id === parseInt(fieldParentTable));
          if (!isValidTable){
            return {
              errorMessage: `Invalid parent table selection.`            
            }
          }
         

        var fieldTargetTable=null;
        if (relation.target_table){
          fieldTargetTable = relation.target_table;
        
          var isValidTable = tables.find(x=>x.id === parseInt(fieldTargetTable));
          if (!isValidTable){
            return {
              errorMessage: `Invalid target table selection.`            
            }
          }
        }
         
        var fieldParentField= null;
        if (relation.on_parent)
        {
          var parentFields = await this.getFieldsByTable(campaignId,fieldParentTable);

          fieldParentField=relation.on_parent;        
          var isValidTable = parentFields.find(x=>x.id === parseInt(fieldParentField));
          if (!isValidTable){
            return {
              errorMessage: `Invalid parent field selection.`            
            }
          }     
        }    

        var fieldTargetField= null;
        if (relation.on_target)
        {
          fieldTargetField=relation.on_target;
          var targetFields = await this.getFieldsByTable(campaignId,fieldTargetTable);

          var isValidTable = targetFields.find(x=>x.id === parseInt(fieldTargetField));
          if (!isValidTable){
            return {
                errorMessage: `Invalid target field selection.`            
            }
          }
        }
          
          
        var sql = `UPDATE sf_dataset_tables_relation 
                  SET parent_table_id = ?,
                      sub_object_id=?,
                      target_table_id=?,
                      relation=?,
                      on_parent=?,
                      on_target=?,
                      parent_exp=?,
                      target_is_constant=?,
                      target_table_exp=?,
                      target_exp=?,
                      additional_join_condition=?
                      WHERE campaign_id=? AND id=?`; 

        if (relation.target_is_constant ==='true'){
          relation.target_is_constant = true;
        }
        else if (relation.target_is_constant==='false'){
          relation.target_is_constant = false;
        }
        var targetIsConstant =  relation.target_is_constant?1:0;
        
        
        try {
          let con = await mysqlClient.getMysqlConnection();
          const data:any = await con.promise().query(sql,[`${fieldParentTable}`,fieldSubObject,fieldTargetTable,`${relation.relation}`,fieldParentField,fieldTargetField,relation.parent_exp,targetIsConstant,relation.target_table_exp,relation.target_exp,`${relation.additional_join_condition}`,campaignId,id]);
          if (data[0] != null && data[0].affectedRows >0){
            return true;
          }
        }
        catch (err) {
          return {
            errorMessage: `Something went wrong.${err}`            
          }
        }
      
      return{
        success: true            
      }
    }

    async createConditions(campaignId, conditions){
      if (conditions.length >0){
        var objects  = await this.getObjects(campaignId);       


        var sql = "INSERT INTO sf_dataset_object_conditions (name,object_id,table_id,where_field,where_clause,group_by,campaign_id) VALUES ?"; 
        
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
          var isValidObject = objects.find(x=>x.id === parseInt(conditionObject));
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
           var isValidTable = fields.find(x=>x.id === parseInt(conditionField));
           if (!isValidTable){
             return false;
           }
         }

          values.push( [`${condition.name}`,`${conditionObject}`,`${conditionTable}`,`${conditionField}`,`${condition.where_clause}`,`${condition.group_by}`,campaignId]);
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
async createSubConditionMapping(subConditionId,condition,campaignId,conditionObject){
  
  var tables =  await this.getTables(campaignId,conditionObject);
  if (condition.fields && condition.fields.length >0){
    var sql = `INSERT INTO sf_dataset_sub_object_conditions_fields (
      sub_condition_id, parent_table_id, parent_table_field,sub_table_id, sub_table_field, campaign_id
    ) VALUES ?`;
    var values = [];
    for(let j=0;j<condition.fields.length;j++){
      var cndfield = condition.fields[j];
      var parentTable=cndfield.parent_table;
      if (typeof cndfield.parent_table === 'object'){
        var table = tables.find(x=>(x.name === cndfield.parent_table.name && x.alias === cndfield.parent_table.alias));
        if (!table){
          return false;
        }
        parentTable = table.id;
      }
      else {
        var isValidTable = tables.find(x=>x.id === parseInt(parentTable));
        if (!isValidTable){
          return false;
        }
      }
      var subTable=cndfield.sub_table;
      if (typeof cndfield.sub_table === 'object'){
        var table = tables.find(x=>(x.name === cndfield.sub_table.name && x.alias === cndfield.sub_table.alias));
        if (!table){
          return false;
        }
        subTable = table.id;
      }
      else {
        var isValidTable = tables.find(x=>x.id === parseInt(subTable));
        if (!isValidTable){
          return false;
        }
      }

      var parentfields = await this.getFieldsByTable(campaignId,parentTable);

      var conditionParentField=cndfield.parent_table_field;
      if (typeof cndfield.parent_table_field === 'object'){
        var field = parentfields.find(x=>(x.name === cndfield.parent_table_field.name));
        if (!field){
          return false;
        }
        conditionParentField = field.id;
      }
      else {
        var isValidTable = parentfields.find(x=>x.id === parseInt(conditionParentField));
        if (!isValidTable){
          return false;
        }
      }

      var subTablefields = await this.getFieldsByTable(campaignId,subTable);

      var conditionSubField=cndfield.sub_table_field;
      if (typeof cndfield.sub_table_field === 'object'){
        var field = subTablefields.find(x=>(x.name === cndfield.sub_table_field.name));
        if (!field){
          return false;
        }
        conditionSubField = field.id;
      }
      else {
        var isValidTable = subTablefields.find(x=>x.id === parseInt(conditionSubField));
        if (!isValidTable){
          return false;
        }
      }
      values.push([`${subConditionId}`,`${parentTable}`,`${conditionParentField}`,`${subTable}`,`${conditionSubField}`,campaignId]);
    }
    let con = await mysqlClient.getMysqlConnection();
    const data:any = await con.promise().query(sql,[values]);
    if (data[0] != null && data[0].affectedRows >0){
      return true;;
    }
  }
}
    async createSubConditions(campaignId, subConditions){
      if (subConditions.length >0){
        var objects  = await this.getObjects(campaignId); 
        for(let i=0;i<subConditions.length;i++){
          var conditionValues =[];
          var condition = subConditions[i];
          var conditionObject = condition.object;
          if (typeof condition.object === 'object'){
            var object = objects.find(x=>x.name === condition.object.name);
            if (!object){
              return false;
            }
            conditionObject = object.id;
          }
          else {
            var isValidObject = objects.find(x=>x.id === parseInt(conditionObject));
            if (!isValidObject){
              return false;
            }
          }

          var conditionSubObject=null;
          if(condition.sub_object){
            var subObjects  = await this.getSubObjectsByObjectId(conditionObject);
            conditionSubObject = condition.sub_object;
            if (typeof condition.sub_object === 'object'){
              var subobject = subObjects.find(x=>x.name === condition.sub_object.name);
              if (!subobject){
                return false;
              }
              conditionSubObject = subobject.id;
            }
            else {
              var isValidSubObject = subObjects.find(x=>x.id === parseInt(conditionSubObject));
              if (!isValidSubObject){
                return false;
              }
            }
          }
          var tables =  await this.getTables(campaignId,conditionObject);
  
          var applyTable=condition.apply_table;
          if (applyTable){
            if (typeof condition.apply_table === 'object'){
              var table = tables.find(x=>(x.name === condition.apply_table.name && x.alias ===  condition.apply_table.alias));
              if (!table){
                return false;
              }
              applyTable = table.id;
            }
            else {
              var isValidTable = tables.find(x=>x.id === parseInt(applyTable));
              if (!isValidTable){
                return false;
              }
            }

            var applyTablefields = await this.getFieldsByTable(campaignId,applyTable);

            var applyTableField=condition.apply_table_field;
            if (typeof condition.apply_table_field === 'object'){
              var field = applyTablefields.find(x=>(x.name === condition.apply_table_field.name));
              if (!field){
                return false;
              }
              applyTableField = field.id;
            }
            else {
              var isValidTable = applyTablefields.find(x=>x.id === parseInt(applyTableField));
              if (!isValidTable){
                return false;
              }
            }
          }
          

          
          try {  
            if (condition.apply_is_data ==='true'){
              condition.apply_is_data = true;
              }
              else if (condition.apply_is_data==='false'){
                condition.apply_is_data = false;
              }
              var isApply =  condition.apply_is_data?1:0;
                       
            var sql = `INSERT INTO sf_dataset_sub_object_conditions (
              name,object_id,sub_object_id,apply_is_data,
              ${condition.apply_is_data?`apply_is_data_conjunction_type,apply_table,apply_table_field,field_where_clause,`:''}
              where_clause,groupby_clause,campaign_id) VALUES ?`;
              conditionValues.push ([`${condition.name}`,`${conditionObject}`,conditionSubObject,`${isApply}`])
            
              if (condition.apply_is_data){
                conditionValues[0].push(`${condition.apply_is_data_conjunction_type}`,applyTable,applyTableField,condition.field_where_clause);
              }
              conditionValues[0].push(`${condition.where_clause}`,`${condition.groupby_clause}`,campaignId);
            let con = await mysqlClient.getMysqlConnection();
            const data:any = await con.promise().query(sql,[conditionValues]);
            if (data[0] != null && data[0].affectedRows >0){
              var subConditionId = data[0].insertId;
              await this.createSubConditionMapping(subConditionId,condition,campaignId,conditionObject);
            }
          }
          catch (err) {
            return false;
          }
        }       
      }
      return true;
    }

    async updateConditions(campaignId, condition,id){
        var objects  = await this.getObjects(campaignId); 

        var conditionObject = condition.object;
        var isValidObject = objects.find(x=>x.id === parseInt(conditionObject));
        if (!isValidObject){
          return {
            errorMessage: `Invalid object selected.`            
          }
        }
        
        var tables =  await this.getTables(campaignId,conditionObject);
        var conditionTable=condition.table;
        var isValidTable = tables.find(x=>x.id === parseInt(conditionTable));
        if (!isValidTable){
          return {
            errorMessage: `Invalid table selected.`            
          }
        }
         

        var fields = await this.getFieldsByTable(campaignId,conditionTable);

        var conditionField=condition.field;        
        var isValidTable = fields.find(x=>x.id === parseInt(conditionField));
        if (!isValidTable){
          return {
            errorMessage: `Invalid field selected.`            
          }
        }
         
        var sql = `UPDATE sf_dataset_object_conditions SET name=?,object_id=?,table_id=?,where_field=?,where_clause=?
                  ,group_by =? WHERE campaign_id = ? AND id=?`; 
        
        try {
          let con = await mysqlClient.getMysqlConnection();
          const data:any = await con.promise().query(sql,[`${condition.name}`,`${conditionObject}`,`${conditionTable}`,`${conditionField}`,`${condition.where_clause}`,`${condition.group_by}`,campaignId,id]);
          if (data[0] != null && data[0].affectedRows >0){
            return true;
          }
        }
        catch (err) {
          return false;
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

    async createSubObjects(campaignId, subobjects){

      if (subobjects.length >0){
        
        var objects  = await this.getObjects(campaignId);
        var sql = "INSERT INTO sf_dataset_sub_objects (name,object_id,apply_on_result,campaign_id) VALUES ?"; 
        
        var values =[];
        for(let i=0;i<subobjects.length;i++){
          var subObject =subobjects[i];
     
          var fieldObject = subObject.object;
          if (typeof subObject.object === 'object'){
            var object = objects.find(x=>x.name === subObject.object.name);
            if (!object){
              return false;
            }
            fieldObject = object.id;
          }
          else {
            var isValidObject = objects.find(x=>x.id === parseInt(fieldObject));
            if (!isValidObject){
              return false;
            }
          }
          if (subObject.apply_on_result ==='true'){
            subObject.send_to_sf = true;
            }
            else if (subObject.apply_on_result==='false'){
              subObject.apply_on_result = false;
            }
           var apply_on_result = subObject.apply_on_result?1:0;
          values.push( [`${subObject.name}`,`${fieldObject}`,`${apply_on_result}`,campaignId]);
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

    async getFields(campaignId,object,table=null,subObject=null): Promise<Array<any> > {
      var dataset:any = await this.getDataSet(campaignId,false);
      var fields = dataset.fields;
      if(dataset){
        if (object && dataset.fields){
          fields =  dataset.fields.filter(x=>x.object === parseInt(object));
        }
        if (table && dataset.fields){
          fields =  dataset.fields.filter(x=>x.field_table === parseInt(table));
        }
        if (subObject && dataset.fields){
          fields =  dataset.fields.filter(x=>x.sub_object === parseInt(subObject));
        }
        return fields;
      }
      return fields;
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
    async deleteTableRelations(relationId) {     
      var sql = `DELETE FROM sf_dataset_tables_relation WHERE id = ${relationId}`; 
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
        var subObjects = datasetResult[0][7];
        var subObjectConditions = datasetResult[0][8];
        if ((validations == null || validations.length == 0 )&& (transformations == null || transformations.length == 0) && (fields == null || fields.length == 0)){
          return null;
        }
        var validationArray = await this.constructValidations(validations);      
        datasetJson.validations = validationArray;  
        var transformationArray = await this.constructTransformations(transformations);    
        datasetJson.transformations  =transformationArray;        
        var objectArr = await this.constructObjects(objects);    
        datasetJson.objects  =objectArr;  
        var subObjectArr = await this.constructSubObjects(subObjects,objectArr); 
        datasetJson.subobjects  =subObjectArr;  
        var tableArr = await this.constructTables(tables,objectArr,subObjectArr);    
        datasetJson.tables  =tableArr;       

        var fieldArr =  await this.constructDataSet(fields,validationArray,transformationArray);
        datasetJson.fields =fieldArr;
        datasetJson.conditions  =await this.constructConditions(conditions,objectArr ,tableArr, fieldArr);
        datasetJson.relations = await this.constructRelations(relations,tableArr, fieldArr,subObjectArr);
        datasetJson.sub_conditions = await this.constructSubConditions(subObjectConditions,objectArr,tableArr, fieldArr,subObjectArr);

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

            if (datasetJson.fields[i].sub_object)
            {
              var subObj = subObjectArr.find(x=>x.id === parseInt( datasetJson.fields[i].sub_object));
              var recSubObj = {name:''}
              if (obj){
                recSubObj.name = subObj.name
                datasetJson.fields[i].sub_object = recSubObj;
              }
            }
            delete datasetJson.fields[i].sub_object;

            var table = tableArr. find(x=>x.id === parseInt( datasetJson.fields[i].table));
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

          for(let i=0;i< datasetJson.subobjects.length;i++){
            delete datasetJson.subobjects[i].id;
          }
          
          for(let i=0;i< datasetJson.tables.length;i++){
            delete datasetJson.tables[i].id;
            delete datasetJson.tables[i].object.id;   
            if (datasetJson.tables[i].sub_object && datasetJson.tables[i].sub_object.id)                   
            {
              delete datasetJson.tables[i].sub_object.id;
            }
            else {
              delete datasetJson.tables[i].sub_object;
            }
          }

          for(let i=0;i< datasetJson.relations.length;i++){
            delete datasetJson.relations[i].id;
            delete datasetJson.relations[i].object.id;
            if (datasetJson.relations[i].parent_table && datasetJson.relations[i].parent_table.id)                   
            {
              delete datasetJson.relations[i].parent_table.id;
            }
            else {
              delete datasetJson.relations[i].parent_table;
            }
            if (datasetJson.relations[i].target_table && datasetJson.relations[i].target_table.id)                   
            {
              delete datasetJson.relations[i].target_table.id;
            }
            else {
              delete datasetJson.relations[i].target_table;
            }
            if (datasetJson.relations[i].on_parent && datasetJson.relations[i].on_parent.id)                   
            {
              delete datasetJson.relations[i].on_parent.id;
            }
            else {
              delete datasetJson.relations[i].on_parent;
            }
            if (datasetJson.relations[i].on_target && datasetJson.relations[i].on_target.id)                   
            {
              delete datasetJson.relations[i].on_target.id;  
            }
            else {
              delete datasetJson.relations[i].on_target;
            }
            if (datasetJson.relations[i].sub_object && datasetJson.relations[i].sub_object.id)                   
            {          
              delete datasetJson.relations[i].sub_object.id;
            }
            else {
              delete datasetJson.relations[i].sub_object;
            }
          }
          for(let i=0;i< datasetJson.conditions.length;i++){
            delete datasetJson.conditions[i].id;
            delete datasetJson.conditions[i].object.id;
            delete datasetJson.conditions[i].table.id;
            delete datasetJson.conditions[i].field.id;
          }
          for(let i=0;i< datasetJson.sub_conditions.length;i++){
            delete datasetJson.sub_conditions[i].id;
            delete datasetJson.sub_conditions[i].object.id;
            if (datasetJson.sub_conditions[i].sub_object && datasetJson.sub_conditions[i].sub_object.id)                   
            {
              delete datasetJson.sub_conditions[i].sub_object.id;
            } 
            else {
              delete datasetJson.sub_conditions[i].sub_object;
            }
            if (datasetJson.sub_conditions[i].apply_table && datasetJson.sub_conditions[i].apply_table.id)                   
            {
              delete datasetJson.sub_conditions[i].apply_table.id;
              delete datasetJson.sub_conditions[i].apply_table_field.id;
            }
            else {
              delete datasetJson.sub_conditions[i].apply_table;
              delete datasetJson.sub_conditions[i].apply_table_field;
            }
            for(let j=0;j<datasetJson.sub_conditions[i].fields.length;j++)
            {          
              delete datasetJson.sub_conditions[i].fields[j].parent_table.id;
              delete datasetJson.sub_conditions[i].fields[j].sub_table.id;
              delete datasetJson.sub_conditions[i].fields[j].parent_table_field.id;                
              delete datasetJson.sub_conditions[i].fields[j].sub_table_field.id;
            }
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

  async constructTables(tables,objects,subObjectArr) {
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
              sub_object:{id:rec.sub_object_id,name:''},
              object:{id: rec.object_id, name:paramObj.name},
              table_db:rec.table_db,
              table_name:rec.table_name,
              alias:rec.alias,
              is_main_table:rec.is_main_table === 1?true: false
            }
            tablArr.push(tableRec);
            let subObj = this.findElementInArray(subObjectArr,rec.sub_object_id);
            if (subObj)
            {
              tableRec.sub_object.name = subObj.name;
            }
          }
        }
      }
    }
    return tablArr;
  }

  async constructRelations(relations,tableArr, fieldArr,subObjArr) {
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
            sub_object:{id:rec.sub_object_id,name:""},
            parent_table:{id:"", name:"",alias:""},
            target_table:{id:"", name:"",alias:""},
            parent_exp:rec.parent_exp,
            target_is_constant: rec.target_is_constant ===1?true:false,
            target_exp:rec.target_exp,
            target_table_exp:rec.target_table_exp,
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

          let subObj = this.findElementInArray(subObjArr,rec.sub_object_id);
          if (subObj)
          {
            relationRec.sub_object.name = subObj.name;
          }

          let parenttableRec = this.findElementInArray(tableArr,rec.parent_table_id);
          if (parenttableRec)
          {
            relationRec.parent_table.id = rec.parent_table_id;
            relationRec.parent_table.name = parenttableRec.table_name;
            relationRec.parent_table.alias= parenttableRec.alias;
            relationRec.object = parenttableRec.object
          }

          if (rec.target_table_id)
          {
            let targettableRec = this.findElementInArray(tableArr,rec.target_table_id);
            if (targettableRec)
            {
              relationRec.target_table.id = rec.target_table_id;
              relationRec.target_table.name = targettableRec.table_name;
              relationRec.target_table.alias= targettableRec.alias;
            }
          }
          
          let parentFieldRec = this.findElementInArray(fieldArr,rec.on_parent);
          if (parentFieldRec)
          {
            relationRec.on_parent.id = rec.on_parent;
            relationRec.on_parent.name = parentFieldRec.name;
          }

          if (rec.on_target)
          {
            let targetFieldRec = this.findElementInArray(fieldArr,rec.on_target);
            if (targetFieldRec)
            {
              relationRec.on_target.id = rec.on_target;
              relationRec.on_target.name = targetFieldRec.name;
            }
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
            where_clause: rec.where_clause,
            group_by:rec.group_by
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

  async constructSubConditions(subObjects,objectArr,tableArr, fieldArr,subObjArr) {
    var subObjectsArr = [];
    if (subObjects && subObjects.length >0)
    {
      for(let i=0;i<subObjects.length;i++){
        var rec = subObjects[i];
        let subObjCdnRec =  this.findElementInArray(subObjectsArr,rec.id);
        if (!subObjCdnRec) {
          subObjCdnRec = {
            id:rec.id,
            name:rec.name,
            object:{id:"", name:""},
            sub_object:{id:rec.sub_object_id,name:""},
            fields:[],
            apply_is_data: rec.apply_is_data === 1? true:false,
            apply_table: {
              id:rec.apply_table,
              name: "",
              alias:""
            },
            apply_table_field: {id:rec.apply_table_field,
              name: ""
            },
            field_where_clause:rec.field_where_clause,
            apply_is_data_conjunction_type: rec.apply_is_data_conjunction_type,
            where_clause:rec.where_clause,
            groupby_clause:rec.groupby_clause
          } 

          
          let applytableRec = this.findElementInArray(tableArr,rec.apply_table);
          if (applytableRec)
          {
            subObjCdnRec.apply_table.id = rec.parent_table_id;
            subObjCdnRec.apply_table.name = applytableRec.table_name;
            subObjCdnRec.apply_table.alias= applytableRec.alias;
          }
          let applyFieldRec = this.findElementInArray(fieldArr,rec.apply_table_field);
          if (applyFieldRec)
          {
            subObjCdnRec.apply_table_field.id = rec.apply_table_field;
            subObjCdnRec.apply_table_field.name = applyFieldRec.name;
          }

          let obj = this.findElementInArray(objectArr,rec.object_id);
          if (obj)
          {
            subObjCdnRec.object.id=rec.object_id;
            subObjCdnRec.object.name=obj.name;
          }

          let subObj = this.findElementInArray(subObjArr,rec.sub_object_id);
          if (subObj)
          {
            subObjCdnRec.sub_object.name = subObj.name;
          }
          
          subObjectsArr.push(subObjCdnRec);
        }
        

        var obj = {          
            parent_table:{id:"", name:"",alias:""},
            sub_table:{id:"", name:"",alias:""},
            parent_table_field: {
              id:"",
              name: "",
              alias:""
            },
            sub_table_field: {id:"",
              name: ""
            }
          }
          

          if (rec.parent_table_id ){
            var field = subObjCdnRec.fields.find(x=>x.parent_table.id === rec.parent_table_id && x.sub_table.id === rec.sub_table_id && x.parent_table_field.id === rec.parent_table_field
              && x.sub_table_field.id === rec.sub_table_field);
            if (!field){
              let parenttableRec = this.findElementInArray(tableArr,rec.parent_table_id);
              if (parenttableRec)
              {
                obj.parent_table.id = rec.parent_table_id;
                obj.parent_table.name = parenttableRec.table_name;
                obj.parent_table.alias= parenttableRec.alias;
              }
              let targettableRec = tableArr.find(x=>x.sub_object.id === rec.sub_object_id && x.id === rec.sub_table_id);
              if (targettableRec)
              {
                obj.sub_table.id = rec.sub_table_id;
                obj.sub_table.name = targettableRec.table_name;
                obj.sub_table.alias= targettableRec.alias;
              }

              let parentFieldRec = this.findElementInArray(fieldArr,rec.parent_table_field);
              if (parentFieldRec)
              {
                obj.parent_table_field.id = rec.parent_table_field;
                obj.parent_table_field.name = parentFieldRec.name;
              }

              let targetFieldRec = this.findElementInArray(fieldArr,rec.sub_table_field);
              if (targetFieldRec)
              {
                obj.sub_table_field.id = rec.sub_table_field;
                obj.sub_table_field.name = targetFieldRec.name;
              }
              subObjCdnRec.fields.push(obj);
            }
          }
        
      }
    }
    return subObjectsArr;
  }



  async constructSubObjects(subObjects,objectArrr) {
    var subObjectsArr = [];
    if (subObjects && subObjects.length >0)
    {
      for(let i=0;i<subObjects.length;i++){
        var rec = subObjects[i];
        let subObjectRec =  this.findElementInArray(subObjectsArr,rec.id);
        if (!subObjectRec) {
          subObjectRec = {
            id:rec.id,
            name:rec.name,
            object:{id:"",name:""},
            apply_on_result:rec.apply_on_result ===1 ?true:false
          } 
          let obj = this.findElementInArray(objectArrr,rec.object_id);
          if (obj)
          {
            subObjectRec.object.id=rec.object_id;
            subObjectRec.object.name=obj.name;
          }       
          subObjectsArr.push(subObjectRec);
        }
      }
    }
    return subObjectsArr;
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
            function:rec.sql_function,
            name: rec.field_name,
            title:rec.field_title ,
            type: rec.field_type,
            object: rec.object,
            object_name:rec.object_name,
            alias_name:rec.alias_name,
            default_sf_map_name: rec.field_sf_map,
            send_to_sf: rec.send_to_sf===1?true:false,
            sub_object:rec.sub_object_id,
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