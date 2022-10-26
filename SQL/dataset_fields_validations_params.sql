CREATE TABLE `sf_dataset_fields_validations_params` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_validation_id` int unsigned NOT NULL,
  `param_id` int unsigned NOT NULL,
  `value` varchar(150) DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `field_validation_param` (`field_validation_id`,`param_id`),
  KEY `FK_FIELD_VALUE_VALIDATION` (`field_validation_id`),
  KEY `FK_FIELD_VALUE_PARAM_ID` (`param_id`),
  CONSTRAINT `FK_FIELD_VALUE_VALIDATION` FOREIGN KEY (`field_validation_id`) REFERENCES `dataset_fields_validations` (`id`),
  CONSTRAINT `FK_FIELD_VALUE_PARAM_ID` FOREIGN KEY (`param_id`) REFERENCES `validations_params` (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8;;