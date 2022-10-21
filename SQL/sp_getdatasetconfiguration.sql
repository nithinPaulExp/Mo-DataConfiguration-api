DELIMITER $$
DROP PROCEDURE IF EXISTS getDataSetConfiguration $$
CREATE PROCEDURE `getDataSetConfiguration`(IN campaignId INT)
BEGIN
Declare validationSQL varchar(10000);
DEclare transformationSQL varchar (10000);
declare fieldsSQL varchar(10000);

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

SET fieldsSQL = ' select df.id as field_id, df.table_name as field_table,df.name as field_name,df.title as field_title,df.sf_map_name as field_sf_map, df.type as field_type,
                  dfv.id as field_validation_id, dfv.field_id as field_validation_field_id, dfv.validation_id as field_validation_validation_id,
                  dfvp.field_validation_id as field_params_validation_id, dfvp.param_id as field_validation_param_id,dfvp.value as field_validation_value
                  ,dft.field_id as field_transform_field_id, dft.transformation_id as field_transform_transform_id,dft.id as field_transform_id
                  from sf_dataset_fields df 
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
	END $$
DELIMITER ;