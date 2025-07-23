## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max | L2 Avg (Exec) | L1 Avg (Data) | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------------: | ------------: | ----: | ---------: |
| **AdvancedToken**           |         |         |               |               |       |            |
|        *blacklist*          |  47,341 |  47,353 |        47,352 |         2,154 |    47 | 0.00117679 |
|        *pause*              |       - |       - |        27,743 |         1,770 |    47 | 0.00069103 |
|        *unblacklist*        |  25,415 |  25,427 |        25,426 |         2,152 |    46 | 0.00063494 |
|        *unpause*            |       - |       - |        27,721 |         1,767 |    46 | 0.00069047 |
| **BasicToken**              |         |         |               |               |       |            |
|        *approve*            |  26,506 |  46,406 |        34,786 |         2,421 |    46 | 0.00086707 |
|        *burn*               |  33,808 |  33,832 |        33,809 |         1,929 |    46 | 0.00084142 |
|        *mint*               |  36,693 |  53,817 |        40,750 |         2,382 |    93 | 0.00101434 |
|        *transfer*           |  34,486 |  51,610 |        35,230 |         2,301 |    46 | 0.00087768 |
| **MultiSigWallet**          |         |         |               |               |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |        63,417 |         1,867 |   139 | 0.00157291 |
|        *executeTransaction* |  70,275 |  70,287 |        70,286 |         1,867 |    46 | 0.00174266 |
|        *revokeConfirmation* |  32,296 |  35,581 |        35,509 |         1,867 |    46 | 0.00088324 |
|        *submitTransaction*  |  81,380 | 101,352 |        85,260 |         2,578 |    48 | 0.00211489 |
| **MyNFT**                   |         |         |               |               |       |            |
|        *approve*            |  48,655 |  48,679 |        48,678 |         2,251 |    46 | 0.00120985 |
|        *batchMint*          |       - |       - |       199,119 |         2,252 |     1 | 0.00492761 |
|        *safeMint*           |  61,562 |  95,762 |        71,491 |         2,096 |    93 | 0.00177314 |
|        *transferFrom*       |  38,426 |  55,526 |        39,507 |         2,607 |    47 | 0.00098431 |
| **SimpleAuction**           |         |         |               |               |       |            |
|        *auctionEnd*         |       - |       - |        62,830 |         1,828 |     2 | 0.00155829 |
|        *bid*                |  40,267 |  69,074 |        48,623 |         1,801 |    95 | 0.00120711 |
|        *withdraw*           |  23,509 |  28,560 |        25,642 |         1,805 |    45 | 0.00063921 |
| **SimpleStaking**           |         |         |               |               |       |            |
|        *exit*               |       - |       - |       153,355 |         1,828 |     1 | 0.00379537 |
|        *getReward*          |  67,287 | 120,587 |        77,424 |         1,809 |    46 | 0.00191888 |
|        *stake*              | 126,368 | 143,468 |       133,372 |         2,037 |    48 | 0.00330219 |
|        *withdraw*           |  72,768 |  81,168 |        80,985 |         2,037 |    46 | 0.00200758 |

## Deployments
|                    | Min | Max  | L2 Avg (Exec) | L1 Avg (Data) | Block % |    usd avg |
| :----------------- | --: | ---: | ------------: | ------------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |       973,081 |        74,896 |   3.2 % | 0.02427690 |
| **BasicToken**     |   - |    - |       768,883 |        57,581 |   2.6 % | 0.01917756 |
| **MultiSigWallet** |   - |    - |     1,262,755 |        89,252 |   4.2 % | 0.03147947 |
| **MyNFT**          |   - |    - |     1,186,392 |        88,124 |     4 % | 0.02958890 |
| **SimpleAuction**  |   - |    - |       412,278 |        25,676 |   1.4 % | 0.01026713 |
| **SimpleStaking**  |   - |    - |       772,065 |        49,000 |   2.6 % | 0.01922987 |

## Solidity and Network Config
| **Settings**        | **Value**        |
| ------------------- | ---------------- |
| Solidity: version   | 0.8.28           |
| Solidity: optimized | true             |
| Solidity: runs      | 1000             |
| Solidity: viaIR     | false            |
| Block Limit         | 30,000,000       |
| L1 Base Fee         | 0.749024307 gwei |
| L1 Blob Base Fee    | 0.00000 gwei     |
| L2 Gas Price        | 0.00664 gwei     |
| Token Price         | 3720.00 usd/eth  |
| Network             | BASE             |
| Toolchain           | hardhat          |

