CREATE TABLE `sf_dataset_object_conditions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `object_id` int unsigned NOT NULL,
  `table_id` int unsigned NOT NULL,
  `where_field` int unsigned NOT NULL,
  `where_clause` varchar(200) NOT NULL,
   `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_TABLE_FIELDS` (`object_id`,`where_field`,`table_id`,`name`),
  KEY `FK_FIELD` (`where_field`),
  KEY `FK_TABLE` (`table_id`),
  KEY `FK_OBJECT` (`object_id`),
  CONSTRAINT `FK_FIELD` FOREIGN KEY (`where_field`) REFERENCES `sf_dataset_fields` (`id`),
  CONSTRAINT `FK_OBJECT` FOREIGN KEY (`object_id`) REFERENCES `sf_dataset_objects` (`id`),
  CONSTRAINT `FK_TABLE` FOREIGN KEY (`table_id`) REFERENCES `sf_dataset_tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;