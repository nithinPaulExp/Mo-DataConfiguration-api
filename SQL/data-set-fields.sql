CREATE TABLE `dataset_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `table` varchar(150) NOT NULL,
  `name` varchar(150) NOT NULL,
  `title` varchar(150) NOT NULL,
  `sf_map_name` varchar(150) NOT NULL,
  `type` varchar(150) NOT NULL,
  `campaign_id` int NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_DATA_FIELDS` (`campaign_id`,`table`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2062609 DEFAULT CHARSET=utf8;;