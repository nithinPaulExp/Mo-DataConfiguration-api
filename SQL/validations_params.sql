CREATE TABLE `validations_params` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` varchar(128) NOT NULL,
  `validation_id` int unsigned NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `validation_param` (`validation_id`,`name`),
  CONSTRAINT `FK_validation` FOREIGN KEY (`validation_id`) REFERENCES `validations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;