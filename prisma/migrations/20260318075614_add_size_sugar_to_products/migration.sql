-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `size_name` VARCHAR(191) NULL,
    ADD COLUMN `sugar_level` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `has_sugar_level` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sizes` JSON NULL;

-- AlterTable
ALTER TABLE `shops` ADD COLUMN `sugar_levels` JSON NULL;
