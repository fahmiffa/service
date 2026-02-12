/*
  Warnings:

  - A unique constraint covering the columns `[rfid]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN "rfid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_rfid_key" ON "Student"("rfid");
