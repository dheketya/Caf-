-- AlterTable
ALTER TABLE `orders` ADD COLUMN `customer_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `total_visits` INTEGER NOT NULL DEFAULT 0,
    `total_spent` DOUBLE NOT NULL DEFAULT 0,
    `last_visit_at` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customers_shop_id_idx`(`shop_id`),
    UNIQUE INDEX `customers_shop_id_phone_key`(`shop_id`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_customer_id_idx` ON `orders`(`customer_id`);
