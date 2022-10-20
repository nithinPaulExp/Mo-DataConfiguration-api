CREATE TABLE `transformation_params` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` varchar(128) NOT NULL,
  `transformation_id` int unsigned NOT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `validation_param` (`transformation_id`,`name`),
  CONSTRAINT `FK_transformation` FOREIGN KEY (`transformation_id`) REFERENCES `transformations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2062609 DEFAULT CHARSET=utf8;;