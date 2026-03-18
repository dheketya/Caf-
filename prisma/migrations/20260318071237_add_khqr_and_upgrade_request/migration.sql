-- AlterTable
ALTER TABLE `platform_settings` ADD COLUMN `khqr_image` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `shops` ADD COLUMN `requested_billing_cycle` VARCHAR(191) NULL,
    ADD COLUMN `requested_package_id` VARCHAR(191) NULL,
    ADD COLUMN `upgrade_status` VARCHAR(191) NOT NULL DEFAULT 'none';
