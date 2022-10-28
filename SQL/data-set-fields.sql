CREATE TABLE `sf_dataset_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `table_name` varchar(150) NOT NULL,
  `name` varchar(150) NOT NULL,
  `title` varchar(150) NOT NULL,
  `sf_map_name` varchar(150) NOT NULL,
  `type` varchar(150) NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `object` varchar(100) NOT NULL,
  `alias_name` varchar(500) NOT NULL,
  `join_type` varchar(100) NOT NULL,
  `join_table` varchar(500) NOT NULL,
  `join_parent_column` varchar(500) NOT NULL,
  `join_target_column` varchar(500) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_DATA_FIELDS` (`campaign_id`,`table_name`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;