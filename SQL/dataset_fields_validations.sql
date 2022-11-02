CREATE TABLE `sf_dataset_fields_validations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_id`  int unsigned NOT NULL,
  `validation_id`  int unsigned NOT NULL,
  `campaign_id` int NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `field_validation_param` (`campaign_id`,`validation_id`,`field_id`),
  KEY `FK_FIELD` (`field_id`),
  KEY `FK_VALIDATION` (`validation_id`),
  CONSTRAINT `FK_FIELD` FOREIGN KEY (`field_id`) REFERENCES `sf_dataset_fields` (`id`),
  CONSTRAINT `FK_VALIDATION` FOREIGN KEY (`validation_id`) REFERENCES `sf_validations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;;