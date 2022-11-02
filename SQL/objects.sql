CREATE TABLE `sf_dataset_objects` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(190) NOT NULL,
  `api_endpoint` varchar(500) NOT NULL,
  `sqs_topic_arn` varchar(500) NOT NULL,
  `campaign_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_DATA_FIELDS` (`name`,`campaign_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;