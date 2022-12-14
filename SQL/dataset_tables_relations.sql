CREATE TABLE `sf_dataset_tables_relation` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parent_table_id` int unsigned NOT NULL,
  `target_table_id` int unsigned NOT NULL,
  `sub_object_id` int UNSIGNED NULL DEFAULT NULL,
  `relation` varchar(200) NOT NULL,
  `on_parent` int unsigned NOT NULL,
  `on_target` int unsigned NOT NULL,
  `additional_join_condition` varchar(500) NOT NULL,
   `campaign_id` int DEFAULT NULL,
  `created` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNQ_TABLE_FIELDS` (`parent_table_id`,`target_table_id`,`relation`),
  KEY `FK_PARENT_FIELD` (`on_parent`),
  KEY `FK_TARGET_TABLE` (`target_table_id`),
  KEY `FK_SUB_OBEJCT_FIELD` (`sub_object_id`), 
  CONSTRAINT `FK_SUB_OBEJCT_FIELD` FOREIGN KEY (`sub_object_id`) REFERENCES `sf_dataset_sub_objects` (`id`),
  CONSTRAINT `FK_PARENT_FIELD` FOREIGN KEY (`on_parent`) REFERENCES `sf_dataset_fields` (`id`),
  CONSTRAINT `FK_PARENT_TABLE` FOREIGN KEY (`parent_table_id`) REFERENCES `sf_dataset_tables` (`id`),
  CONSTRAINT `FK_TARGET_FIELD` FOREIGN KEY (`target_table_id`) REFERENCES `sf_dataset_fields` (`id`),
  CONSTRAINT `FK_TARGET_TABLE` FOREIGN KEY (`target_table_id`) REFERENCES `sf_dataset_tables` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE sf_dataset_tables_relation MODIFY on_target int UNSIGNED NULL DEFAULT NULL;

ALTER TABLE sf_dataset_tables_relation ADD COLUMN parent_exp VARCHAR(500) NULL DEFAULT NULL AFTER sub_object_id;
ALTER TABLE sf_dataset_tables_relation ADD COLUMN target_table_exp VARCHAR(500) NULL DEFAULT NULL AFTER sub_object_id;
ALTER TABLE sf_dataset_tables_relation MODIFY on_parent int UNSIGNED NULL DEFAULT NULL;

ALTER TABLE sf_dataset_tables_relation ADD COLUMN target_is_constant TINYINT NOT NULL;

ALTER TABLE sf_dataset_tables_relation ADD COLUMN target_exp VARCHAR(500) NULL DEFAULT NULL AFTER target_table_id;