DELIMITER $$
DROP PROCEDURE IF EXISTS deleteField $$
CREATE PROCEDURE `deleteField`(IN fieldId INT, IN canDelField INT)
BEGIN

	DELETE FROM sf_dataset_fields_validations_params WHERE id IN
                (SELECT id from sf_dataset_fields_validations WHERE field_id = fieldId);
                
    DELETE from sf_dataset_fields_validations WHERE field_id = fieldId;
    
    DELETE FROM sf_dataset_fields_transformations WHERE field_id = fieldId;
    IF(canDelField IS NULL OR canDelField = 1) THEN
    	DELETE FROM sf_dataset_fields WHERE id = fieldId;
    	DELETE FROM sf_dataset_tables_relation WHERE (on_parent = fieldId OR on_target = fieldId);
    	DELETE FROM sf_dataset_object_conditions WHERE where_field = fieldId;
    END IF;

END $$
DELIMITER ;