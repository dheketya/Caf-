-- AlterTable
ALTER TABLE `packages` ADD COLUMN `annual_price` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `is_visible` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `monthly_price` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shops` ADD COLUMN `billing_cycle` VARCHAR(191) NOT NULL DEFAULT 'monthly',
    ADD COLUMN `brand_color` VARCHAR(191) NOT NULL DEFAULT '#e85d3a';
