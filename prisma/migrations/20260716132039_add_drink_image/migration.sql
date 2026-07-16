/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Drink` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `drink` ADD COLUMN `image` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Drink_name_key` ON `Drink`(`name`);
