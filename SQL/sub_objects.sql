CREATE TABLE `sf_dataset_sub_objects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `object_id` int unsigned NOT NULL,
  `apply_on_result` tinyint NOT NULL DEFAULT '0',
    `campaign_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_DATA_FIELDS` (`name`,`object_id`),
  KEY `FK_PARENT_FIELD` (`object_id`),   
  CONSTRAINT `FK_PARENT_FIELD` FOREIGN KEY (`object_id`) REFERENCES `sf_dataset_objects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;