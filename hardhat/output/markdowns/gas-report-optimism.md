## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max | L2 Avg (Exec) | L1 Avg (Data) | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------------: | ------------: | ----: | ---------: |
| **AdvancedToken**           |         |         |               |               |       |            |
|        *blacklist*          |  47,341 |  47,353 |        47,352 |         2,223 |    47 | 0.00018510 |
|        *pause*              |       - |       - |        27,743 |         1,840 |    47 | 0.00011040 |
|        *unblacklist*        |  25,415 |  25,427 |        25,426 |         2,223 |    46 | 0.00010313 |
|        *unpause*            |       - |       - |        27,721 |         1,840 |    46 | 0.00011032 |
| **BasicToken**              |         |         |               |               |       |            |
|        *approve*            |  26,506 |  46,406 |        34,786 |         2,421 |    46 | 0.00013884 |
|        *burn*               |  33,808 |  33,832 |        33,809 |         2,057 |    46 | 0.00013387 |
|        *mint*               |  36,693 |  53,817 |        40,750 |         2,445 |    93 | 0.00016123 |
|        *transfer*           |  34,486 |  51,610 |        35,230 |         2,429 |    46 | 0.00014053 |
| **MultiSigWallet**          |         |         |               |               |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |        63,417 |         1,995 |   139 | 0.00024433 |
|        *executeTransaction* |  70,275 |  70,287 |        70,286 |         1,995 |    46 | 0.00027002 |
|        *revokeConfirmation* |  32,296 |  35,581 |        35,509 |         1,995 |    46 | 0.00014000 |
|        *submitTransaction*  |  81,380 | 101,352 |        85,260 |         2,706 |    48 | 0.00032858 |
| **MyNFT**                   |         |         |               |               |       |            |
|        *approve*            |  48,655 |  48,679 |        48,678 |         2,379 |    46 | 0.00019063 |
|        *batchMint*          |       - |       - |       199,119 |         2,380 |     1 | 0.00075307 |
|        *safeMint*           |  61,562 |  95,762 |        71,491 |         2,224 |    93 | 0.00027535 |
|        *transferFrom*       |  38,426 |  55,526 |        39,507 |         2,735 |    47 | 0.00015763 |
| **SimpleAuction**           |         |         |               |               |       |            |
|        *auctionEnd*         |       - |       - |        62,830 |         1,828 |     2 | 0.00024153 |
|        *bid*                |  40,267 |  69,074 |        48,623 |         1,929 |    95 | 0.00018879 |
|        *withdraw*           |  23,509 |  28,560 |        25,642 |         1,808 |    45 | 0.00010243 |
| **SimpleStaking**           |         |         |               |               |       |            |
|        *exit*               |       - |       - |       153,355 |         1,828 |     1 | 0.00057997 |
|        *getReward*          |  67,287 | 120,587 |        77,424 |         1,809 |    46 | 0.00029603 |
|        *stake*              | 126,368 | 143,468 |       133,372 |         2,037 |    48 | 0.00050602 |
|        *withdraw*           |  72,768 |  81,168 |        80,985 |         2,037 |    46 | 0.00031017 |

## Deployments
|                    | Min | Max  | L2 Avg (Exec) | L1 Avg (Data) | Block % |    usd avg |
| :----------------- | --: | ---: | ------------: | ------------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |       973,081 |        74,884 |   3.2 % | 0.00390990 |
| **BasicToken**     |   - |    - |       768,883 |        57,624 |   2.6 % | 0.00308380 |
| **MultiSigWallet** |   - |    - |     1,262,755 |        89,380 |   4.2 % | 0.00504551 |
| **MyNFT**          |   - |    - |     1,186,392 |        88,252 |     4 % | 0.00475592 |
| **SimpleAuction**  |   - |    - |       412,278 |        25,804 |   1.4 % | 0.00163505 |
| **SimpleStaking**  |   - |    - |       772,065 |        49,000 |   2.6 % | 0.00306438 |

## Solidity and Network Config
| **Settings**        | **Value**        |
| ------------------- | ---------------- |
| Solidity: version   | 0.8.28           |
| Solidity: optimized | true             |
| Solidity: runs      | 1000             |
| Solidity: viaIR     | false            |
| Block Limit         | 30,000,000       |
| L1 Base Fee         | 0.713624301 gwei |
| L1 Blob Base Fee    | 0.00000 gwei     |
| L2 Gas Price        | 0.00100 gwei     |
| Token Price         | 3720.00 usd/eth  |
| Network             | OPTIMISM         |
| Toolchain           | hardhat          |

