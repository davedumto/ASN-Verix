ALTER TABLE "ExecutionReceipt" ADD COLUMN "anchorContractId" TEXT;
ALTER TABLE "ExecutionReceipt" ADD COLUMN "anchorTxHash" TEXT;
ALTER TABLE "ExecutionReceipt" ADD COLUMN "anchoredAt" TIMESTAMP(3);
