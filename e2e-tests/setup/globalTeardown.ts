export default async function globalTeardown() {
  console.log("\n🧹 Global Teardown selesai");
  // Token cleanup otomatis karena global scope di-reset Jest
}
