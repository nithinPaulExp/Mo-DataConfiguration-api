DELIMITER $$
DROP PROCEDURE IF EXISTS getDataSetConfiguration $$
CREATE PROCEDURE `getDataSetConfiguration`(IN campaignId INT)
BEGIN
Declare validationSQL varchar(10000);
DEclare transformationSQL varchar (10000);
declare fieldsSQL varchar(10000);
declare objectsSQL varchar(10000);
declare tableSQL varchar(10000);
declare relationSQL varchar(10000);
declare conditionSQL varchar(10000);

SET validationSQL = 'SELECT v.id as validation_id,v.name as validation_name, v.method as validation_method,v.type as validation_type,
vp.id as validation_param_id,vp.name as validation_param_name,vp.type as validation_param_type
from sf_validations v
inner join sf_validations_params vp
on v.id = vp.validation_id WHERE ';

 if campaignId IS NULL then
 	SET validationSQL = CONCAT(validationSQL,'v.campaign_id is null');
 else 
 SET validationSQL = CONCAT(validationSQL,'v.campaign_id=',campaignId);
end if;
SET @sqlQuery = validationSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;
	
SET transformationSQL = ' SELECT t.id as transformation_id, t.name as transformation_name, t.method as transformation_method,
tp.transformation_id as transform_param_transformId, tp.name as transform_param_name,tp.id as transform_param_id ,tp.type as transform_param_type
from sf_transformations t
left join sf_transformation_params tp
on t.id = tp.transformation_id WHERE ';

if campaignId IS NULL then
 SET transformationSQL = CONCAT(transformationSQL,'t.campaign_id is null');
 else 
 SET transformationSQL = CONCAT(transformationSQL,'t.campaign_id=',campaignId);
end if;
SET @sqlQuery = transformationSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;

SET fieldsSQL = ' select df.id as field_id, df.table_id as field_table,df.name as field_name,df.title as field_title,df.sf_map_name as field_sf_map, df.type as field_type,df.object,obj.display_name as object_name,df.alias_name,df.send_to_sf,tbl.table_name,
                  dfv.id as field_validation_id, dfv.field_id as field_validation_field_id, dfv.validation_id as field_validation_validation_id,
                  dfvp.field_validation_id as field_params_validation_id, dfvp.param_id as field_validation_param_id,dfvp.value as field_validation_value
                  ,dft.field_id as field_transform_field_id, dft.transformation_id as field_transform_transform_id,dft.id as field_transform_id
                  from sf_dataset_fields df 
                      inner join sf_dataset_objects obj
                      on df.object = obj.id
                      inner join sf_dataset_tables tbl
                      on df.table_id = tbl.id
                      left join sf_dataset_fields_transformations dft
                      on df.id = dft.field_id
                      left join sf_dataset_fields_validations dfv
                      on df.id = dfv.field_id
                      left join sf_dataset_fields_validations_params dfvp
                      on dfv.id = dfvp.field_validation_id WHERE ';
                      
   	if campaignId IS NULL then
 		SET fieldsSQL = CONCAT(fieldsSQL,'df.campaign_id is null');
 	else 
 		SET fieldsSQL = CONCAT(fieldsSQL,'df.campaign_id=',campaignId);
	end if;
              
SET @sqlQuery = fieldsSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;
	
SET objectsSQL = ' SELECT id,name, display_name, api_endpoint, sqs_topic_arn,key_field from sf_dataset_objects WHERE ';

if campaignId IS NULL then
 SET objectsSQL = CONCAT(objectsSQL,'campaign_id is null');
 else 
 SET objectsSQL = CONCAT(objectsSQL,'campaign_id=',campaignId);
end if;
SET @sqlQuery = objectsSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;
	
SET tableSQL = ' SELECT id,object_id,table_db, table_name, alias,is_main_table FROM sf_dataset_tables WHERE ';

if campaignId IS NULL then
 SET tableSQL = CONCAT(tableSQL,'campaign_id is null');
 else 
 SET tableSQL = CONCAT(tableSQL,'campaign_id=',campaignId);
end if;
SET @sqlQuery = tableSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;

SET relationSQL = ' SELECT id,parent_table_id, target_table_id,relation, on_parent, on_target, additional_join_condition FROM sf_dataset_tables_relation WHERE ';

if campaignId IS NULL then
 SET relationSQL = CONCAT(relationSQL,'campaign_id is null');
 else 
 SET relationSQL = CONCAT(relationSQL,'campaign_id=',campaignId);
end if;
SET @sqlQuery = relationSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;
	
SET conditionSQL = ' SELECT id,name,object_id, table_id,where_field, where_clause FROM sf_dataset_object_conditions WHERE ';

if campaignId IS NULL then
 SET conditionSQL = CONCAT(conditionSQL,'campaign_id is null');
 else 
 SET conditionSQL = CONCAT(conditionSQL,'campaign_id=',campaignId);
end if;
SET @sqlQuery = conditionSQL;
PREPARE stmt FROM @sqlQuery;
	EXECUTE stmt;     
	DEALLOCATE PREPARE stmt;
	
	END $$
DELIMITER ;