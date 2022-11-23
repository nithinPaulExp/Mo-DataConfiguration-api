CREATE TABLE `sf_dataset_tables` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id` int unsigned NOT NULL,
  `sub_object_id` int UNSIGNED NULL DEFAULT NULL,
  `table_db` varchar(200) DEFAULT NULL,
  `table_name` varchar(200) NOT NULL,
  `alias` varchar(200) NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_main_table` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_TABLE_FIELDS` (`campaign_id`,`table_name`,`alias`,`object_id`),
  KEY `FK_PARENT_FIELD` (`object_id`), 
  KEY `FK_SUB_OBEJCT_FIELD` (`sub_object_id`), 
  CONSTRAINT `FK_PARENT_FIELD` FOREIGN KEY (`object_id`) REFERENCES `sf_dataset_objects` (`id`),
  CONSTRAINT `FK_SUB_OBEJCT_FIELD` FOREIGN KEY (`sub_object_id`) REFERENCES `sf_dataset_sub_objects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;