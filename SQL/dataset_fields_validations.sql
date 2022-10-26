CREATE TABLE `sf_dataset_fields_validations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_id`  int unsigned NOT NULL,
  `validation_id`  int unsigned NOT NULL,
  `campaign_id` int NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `field_validation_param` (`campaign_id`,`validation_id`,`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;;