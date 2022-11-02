DELIMITER $$
DROP PROCEDURE IF EXISTS deleteField $$
CREATE PROCEDURE `deleteField`(IN fieldId INT, IN canDelField INT)
BEGIN

	DELETE FROM sf_dataset_fields_validations_params WHERE field_validation_id IN
                (SELECT id from sf_dataset_fields_validations WHERE field_id = fieldId);
                
    DELETE from sf_dataset_fields_validations WHERE field_id = fieldId;
    
    DELETE FROM sf_dataset_fields_transformations WHERE field_id = fieldId;
    IF(canDelField IS NULL OR canDelField = 1) THEN
    	DELETE FROM sf_dataset_fields WHERE id = fieldId;
    END IF;

END $$
DELIMITER ;