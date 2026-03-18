-- AlterTable
ALTER TABLE `shops` ADD COLUMN `loyalty_discount_type` VARCHAR(191) NOT NULL DEFAULT 'percentage',
    ADD COLUMN `loyalty_discount_value` DOUBLE NOT NULL DEFAULT 10,
    ADD COLUMN `loyalty_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `loyalty_target` INTEGER NOT NULL DEFAULT 10;
