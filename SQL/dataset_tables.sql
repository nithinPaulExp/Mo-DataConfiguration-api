/*
 * Executed on 3 November 2022 at 10:38:27 AM
 */

CREATE TABLE `sf_dataset_tables` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `object_id`int unsigned NOT NULL,
  `table_db` varchar(200) NULL,
  `table_name` varchar(200) NOT NULL,
  `alias` varchar(200) NOT NULL,
  `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_TABLE_FIELDS` (`campaign_id`,`table_name`,`alias`,`object_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;