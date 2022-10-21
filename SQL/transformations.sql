CREATE TABLE `transformations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `method` varchar(128) NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transformation_campaign` (`campaign_id`,`name`,`method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;