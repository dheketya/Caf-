-- CreateTable
CREATE TABLE `platform_settings` (
    `id` VARCHAR(191) NOT NULL,
    `telegram_username` VARCHAR(191) NULL,
    `telegram_group_link` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sale_limit` INTEGER NULL,
    `modules` JSON NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shops` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Phnom_Penh',
    `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `package_id` VARCHAR(191) NOT NULL,
    `sale_count` INTEGER NOT NULL DEFAULT 0,
    `sale_count_reset_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quota_override` INTEGER NULL,
    `quota_override_note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shops_package_id_idx`(`package_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER', 'CASHIER', 'KITCHEN') NOT NULL DEFAULT 'CASHIER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `shop_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_shop_id_idx`(`shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invitations` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('PLATFORM_OWNER', 'SHOP_OWNER', 'MANAGER', 'CASHIER', 'KITCHEN') NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `token` VARCHAR(191) NOT NULL,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invitations_token_key`(`token`),
    INDEX `invitations_shop_id_idx`(`shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `categories_shop_id_idx`(`shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `sku` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_out_of_stock` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `category_id` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_shop_id_idx`(`shop_id`),
    INDEX `products_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modifier_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `modifier_groups_shop_id_idx`(`shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modifiers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price_adjustment` DOUBLE NOT NULL DEFAULT 0,
    `group_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `modifiers_group_id_idx`(`group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_modifier_groups` (
    `product_id` VARCHAR(191) NOT NULL,
    `modifier_group_id` VARCHAR(191) NOT NULL,

    INDEX `product_modifier_groups_modifier_group_id_idx`(`modifier_group_id`),
    PRIMARY KEY (`product_id`, `modifier_group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `order_number` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `subtotal` DOUBLE NOT NULL,
    `discount_type` VARCHAR(191) NULL,
    `discount_value` DOUBLE NULL,
    `discount_reason` VARCHAR(191) NULL,
    `tax_amount` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `payment_method` ENUM('CASH', 'CARD', 'QR_EWALLET', 'SPLIT') NULL,
    `amount_tendered` DOUBLE NULL,
    `change_amount` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `kitchen_ready` BOOLEAN NOT NULL DEFAULT false,
    `shop_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `orders_shop_id_idx`(`shop_id`),
    INDEX `orders_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `notes` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_item_modifiers` (
    `id` VARCHAR(191) NOT NULL,
    `price_adjustment` DOUBLE NOT NULL,
    `order_item_id` VARCHAR(191) NOT NULL,
    `modifier_id` VARCHAR(191) NOT NULL,

    INDEX `order_item_modifiers_order_item_id_idx`(`order_item_id`),
    INDEX `order_item_modifiers_modifier_id_idx`(`modifier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `current_quantity` DOUBLE NOT NULL DEFAULT 0,
    `reorder_threshold` DOUBLE NOT NULL DEFAULT 0,
    `cost_per_unit` DOUBLE NOT NULL DEFAULT 0,
    `shop_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stock_items_shop_id_idx`(`shop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_ingredients` (
    `id` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `stock_item_id` VARCHAR(191) NOT NULL,

    INDEX `product_ingredients_product_id_idx`(`product_id`),
    INDEX `product_ingredients_stock_item_id_idx`(`stock_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('RECEIVE', 'WASTAGE', 'CORRECTION', 'SALE_DEDUCTION') NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `supplier_name` VARCHAR(191) NULL,
    `purchase_price` DOUBLE NULL,
    `reason` VARCHAR(191) NULL,
    `stock_item_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stock_adjustments_stock_item_id_idx`(`stock_item_id`),
    INDEX `stock_adjustments_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_entries` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `category` VARCHAR(191) NULL,
    `expense_category` ENUM('INGREDIENTS', 'RENT', 'UTILITIES', 'SALARIES', 'OTHER') NULL,
    `vendor_name` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `receipt_url` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `shop_id` VARCHAR(191) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `finance_entries_shop_id_idx`(`shop_id`),
    INDEX `finance_entries_created_by_id_idx`(`created_by_id`),
    INDEX `finance_entries_approved_by_id_idx`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PAID', 'PENDING', 'UNPAID') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(191) NULL,
    `shop_id` VARCHAR(191) NOT NULL,
    `package_id` VARCHAR(191) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `invoices_shop_id_idx`(`shop_id`),
    INDEX `invoices_package_id_idx`(`package_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `image_url` VARCHAR(191) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `shop_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_shop_id_idx`(`shop_id`),
    INDEX `chat_messages_sender_id_idx`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
