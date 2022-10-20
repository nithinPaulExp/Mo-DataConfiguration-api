CREATE TABLE `dataset_fields_transformations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_id` int unsigned NOT NULL,
  `transformation_id` int unsigned NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `field_validation_param` (`campaign_id`,`transformation_id`,`field_id`),
  KEY `FK_FIELD` (`field_id`),
  KEY `FK_TRANSFORMATION_FIELD` (`transformation_id`),
  CONSTRAINT `FK_FIELD_TRANSFORM` FOREIGN KEY (`field_id`) REFERENCES `dataset_fields` (`id`),
  CONSTRAINT `FK_TRANSFORMATION_FIELD` FOREIGN KEY (`transformation_id`) REFERENCES `transformations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2062609 DEFAULT CHARSET=utf8;