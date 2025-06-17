import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasicPoolModule = buildModule("BasicPoolModule", (m) => {
  const basicPool = m.contract("BasicPool", []);
  
  return { basicPool };
});

export default BasicPoolModule;