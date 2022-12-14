import S3Helper from '../services/s3Client';
import Campaigns from '../api-models/campaigns.api.model';
import DataCofigurationDAL from '../dal/dataconfiguration.dal';
import SalesforceHelper from '../helpers/salesforce';

const dataConfigurationDAL = new DataCofigurationDAL();
const salesforce = new SalesforceHelper();
export default class DataCofigurationBLL {
  async getCampaigns(): Promise<any> {
    const campaigns = await dataConfigurationDAL.getCampaigns();
    return automapper.map('CampaignsDM', Campaigns, campaigns);
  }

  async getObjects(campaignId): Promise<any> {
    return await dataConfigurationDAL.getObjects(campaignId);
  }
  async getSubObjects(campaignId,objId): Promise<any> {
    return await dataConfigurationDAL.getSubObjects(campaignId,objId);
  }

  async getTables(campaignId,objectId,subobject=null): Promise<any> {
    return await dataConfigurationDAL.getTables(campaignId,objectId,subobject);
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

  async createOrUpdateTable(campaignId,obj,tableId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateTable(campaignId,obj,tableId);
      
  }

  async getConditions(campaignId,objId): Promise<any> {
    
    return await dataConfigurationDAL.getConditions(campaignId,objId);
      
  }
  async getSubObjectsConditions(campaignId,objId,subObjectId): Promise<any> {
    
    return await dataConfigurationDAL.getSubObjectsConditions(campaignId,objId,subObjectId);
      
  }
  
  
  async createOrUpdateCondition(campaignId,obj,id=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateConditions(campaignId,obj,id);
      
  }
  async createOrUpdateSubCondition(campaignId,obj,id=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateSubConditions(campaignId,obj,id);
      
  }

  async deleteCondition(condId): Promise<any> {
    return await dataConfigurationDAL.deleteCondition(condId);      
  }
  async deleteSubCondition(condId): Promise<any> {
    return await dataConfigurationDAL.deleteSubCondition(condId);      
  }

  async getCredential(): Promise<any> {
    return await dataConfigurationDAL.getCredential();      
  }

  async saveCredential(obj): Promise<any> {
    return await dataConfigurationDAL.saveCredential(obj);      
  }

  async getRelations(campaignId,objId,subobject): Promise<any> {
    
    return await dataConfigurationDAL.getRelations(campaignId,objId,subobject);      
  }

  async generateData(campaignId, objId, request) {
    var data:any = await dataConfigurationDAL.generateData(campaignId, objId, request);
    if (data.errorMessage || data.errors) {
        if (data.errors) {
            return {
                errorMessage: "Validation errors occured",
                data: data.result,
                sql:data.sql,
                errors: data.errors
            };
        }
    }
    var yields = data.result;
    var sendToSF = request.is_send ? true : false;
    if (sendToSF) {
        //establish salesforce connection
        var objects = await dataConfigurationDAL.getObjects(campaignId);
        var obj = objects.find(x => x.id === parseInt(objId));
        try {
            var payload = {
                [obj.key_field]: yields
            };
            var cred = await dataConfigurationDAL.getCredential();
            if (!cred || cred[0] == null) {
                return {
                    errorMessage: "Failed to push data. No credentials found",
                    data: yields,
                    sql:data.sql
                };
            }
            await salesforce.initialise(cred[0].user_name, cred[0].password, cred[0].token, cred[0].login_url);
            var conn = await salesforce.getConnection();
            if (conn) {
                //console.log(connection)
                var response = await salesforce.sendData(payload, obj.api_endpoint);
                if (response.err) {
                    return {
                        errorMessage: "Failed to push data" + response.err,
                        data: yields,
                        sql:data.sql
                    };
                }
                else {
                    return {
                        success: response.response,
                        data: yields,
                        sql:data.sql
                    };
                }
            }
            else {
                return {
                    errorMessage: "Failed to establish connection with salesforce",
                    data: yields,
                    sql:data.sql
                };
            }
        }
        catch (e) {
            return {
                errorMessage: "Failed to send data to salesforce" + e,
                data: yields,
                sql:data.sql
            };
        }
    }
    return { data: yields, sql:data.sql };
}

  
  async deleteTable(tableId): Promise<any> {
    return await dataConfigurationDAL.deleteTable(tableId);
      
  }

  async getValidations(campaignId): Promise<any> {
    return await dataConfigurationDAL.getValidations(campaignId);
      
  }

  
  async deleteValidation(validationId): Promise<any> {
    return await dataConfigurationDAL.deleteValidation(validationId);
      
  }

  async createOrUpdateTransformation(campaignId,obj,transformationId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateTransformation(campaignId,obj,transformationId);
      
  }

  async createOrUpdateObject(campaignId,obj,objectId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateObject(campaignId,obj,objectId);
      
  }

  async createOrUpdateSubObject(campaignId,obj,objectId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateSubObject(campaignId,obj,objectId);
      
  }

  async getTransformations(campaignId): Promise<any> {
    return await dataConfigurationDAL.getTransformations(campaignId);
      
  }

  
  async deleteTransformation(transformationId): Promise<any> {
    return await dataConfigurationDAL.deleteTransformation(transformationId);
      
  }

  async deleteObject(objectId): Promise<any> {
    return await dataConfigurationDAL.deleteObject(objectId);
      
  }
  async deleteSubObject(objectId): Promise<any> {
    return await dataConfigurationDAL.deleteSubObject(objectId);
      
  }

  async createOrUpdateFields(campaignId,obj,fieldId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateFields(campaignId,obj,fieldId);
      
  }

  async createOrUpdateTableRelations(campaignId,obj,relationId=null): Promise<any> {
    return await dataConfigurationDAL.createOrUpdateRelations(campaignId,obj,relationId);
      
  }

  async getFields(campaignId,object = null,table = null,subObject=null): Promise<any> {
    return await dataConfigurationDAL.getFields(campaignId,object,table,subObject);      
  }

  async getDatabases(): Promise<any> {
    return await dataConfigurationDAL.getDbs();
      
  }
  async getTablesFromDB(dbName,campaignId): Promise<any> {
    return await dataConfigurationDAL.getTablesFromDB(dbName,campaignId);
      
  }
  async getColumsInTableFromDB(dbName,tableName,campaignId): Promise<any> {
    return await dataConfigurationDAL.getColumsInTableFromDB(dbName,tableName,campaignId);
      
  }

  
  async deleteField(fieldId): Promise<any> {
    return await dataConfigurationDAL.deleteField(fieldId);
      
  }

  async deleteTableRelations(relationId): Promise<any> {
    return await dataConfigurationDAL.deleteTableRelations(relationId);
      
  }

}
