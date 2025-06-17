import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyNFTModule = buildModule("MyNFTModule", (m) => {
  const name = m.getParameter("name", "MyNFT");
  const symbol = m.getParameter("symbol", "MNFT");
  
  const myNFT = m.contract("MyNFT", [name, symbol]);
  
  return { myNFT };
});

export default MyNFTModule;