-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(191) NOT NULL
);

-- CreateTable
CREATE TABLE "Drink" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(191) NOT NULL
);

-- CreateTable
CREATE TABLE "UserDrink" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "drinkId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDrink_userId_drinkId_key"
ON "UserDrink"("userId", "drinkId");

-- AddForeignKey
ALTER TABLE "UserDrink"
ADD CONSTRAINT "UserDrink_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDrink"
ADD CONSTRAINT "UserDrink_drinkId_fkey"
FOREIGN KEY ("drinkId") REFERENCES "Drink"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
