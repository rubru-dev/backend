const { PrismaClient } = require("./node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.vendorTreatment.deleteMany();
  await prisma.qcVisit.deleteMany();
  await prisma.monthlyReport.deleteMany();
  await prisma.serviceContract.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.workPlanItem.deleteMany();
  await prisma.workPlan.deleteMany();
  await prisma.outstandingInvoice.deleteMany();
  await prisma.renewal.deleteMany();
  await prisma.b2BSurveyReport.deleteMany();
  await prisma.afterSurvey.deleteMany();
  await prisma.surveyPicAssignment.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.orderSheet.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.user.deleteMany();
  console.log("Done: semua data dihapus.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
