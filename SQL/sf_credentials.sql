CREATE TABLE `sf_credentials` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_name` varchar(400) NOT NULL,
  `password` varchar(300) NOT NULL,
  `token` varchar(500) NOT NULL,
  `login_url` varchar(500) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_DATA_FIELDS` (`user_name`,`login_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;