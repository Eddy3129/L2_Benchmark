## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max | L2 Avg (Exec) | L1 Avg (Bytes) | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------------: | -------------: | ----: | ---------: |
| **AdvancedToken**           |         |         |               |                |       |            |
|        *blacklist*          |  47,341 |  47,353 |        47,352 |            240 |    47 | 0.00176149 |
|        *pause*              |       - |       - |        27,743 |            216 |    47 | 0.00103204 |
|        *unblacklist*        |  25,415 |  25,427 |        25,426 |            239 |    46 | 0.00094585 |
|        *unpause*            |       - |       - |        27,721 |            215 |    46 | 0.00103122 |
| **BasicToken**              |         |         |               |                |       |            |
|        *approve*            |  26,506 |  46,406 |        34,786 |            252 |    46 | 0.00129404 |
|        *burn*               |  33,808 |  33,832 |        33,809 |            222 |    46 | 0.00125769 |
|        *mint*               |  36,693 |  53,817 |        40,750 |            249 |    93 | 0.00151590 |
|        *transfer*           |  34,486 |  51,610 |        35,230 |            247 |    46 | 0.00131056 |
| **MultiSigWallet**          |         |         |               |                |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |        63,417 |            216 |   139 | 0.00235911 |
|        *executeTransaction* |  70,275 |  70,287 |        70,286 |            215 |    46 | 0.00261464 |
|        *revokeConfirmation* |  32,296 |  35,581 |        35,509 |            215 |    46 | 0.00132093 |
|        *submitTransaction*  |  81,380 | 101,352 |        85,260 |            252 |    48 | 0.00317167 |
| **MyNFT**                   |         |         |               |                |       |            |
|        *approve*            |  48,655 |  48,679 |        48,678 |            244 |    46 | 0.00181082 |
|        *batchMint*          |       - |       - |       199,119 |            242 |     1 | 0.00740723 |
|        *safeMint*           |  61,562 |  95,762 |        71,491 |            236 |    93 | 0.00265947 |
|        *transferFrom*       |  38,426 |  55,526 |        39,507 |            263 |    47 | 0.00146966 |
| **SimpleAuction**           |         |         |               |                |       |            |
|        *auctionEnd*         |       - |       - |        62,830 |            217 |     2 | 0.00233728 |
|        *bid*                |  40,267 |  69,074 |        48,623 |            218 |    95 | 0.00180878 |
|        *withdraw*           |  23,509 |  28,560 |        25,642 |            217 |    45 | 0.00095388 |
| **SimpleStaking**           |         |         |               |                |       |            |
|        *exit*               |       - |       - |       153,355 |            218 |     1 | 0.00570481 |
|        *getReward*          |  67,287 | 120,587 |        77,424 |            216 |    46 | 0.00288017 |
|        *stake*              | 126,368 | 143,468 |       133,372 |            228 |    48 | 0.00496144 |
|        *withdraw*           |  72,768 |  81,168 |        80,985 |            228 |    46 | 0.00301264 |

## Deployments
|                    | Min | Max  | L2 Avg (Exec) | L1 Avg (Bytes) | Block % |    usd avg |
| :----------------- | --: | ---: | ------------: | -------------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |       973,081 |          2,827 |   3.2 % | 0.03619861 |
| **BasicToken**     |   - |    - |       768,883 |          2,198 |   2.6 % | 0.02860245 |
| **MultiSigWallet** |   - |    - |     1,262,755 |          3,235 |   4.2 % | 0.04697449 |
| **MyNFT**          |   - |    - |     1,186,392 |          3,373 |     4 % | 0.04413378 |
| **SimpleAuction**  |   - |    - |       412,278 |          1,206 |   1.4 % | 0.01533674 |
| **SimpleStaking**  |   - |    - |       772,065 |          1,900 |   2.6 % | 0.02872082 |

## Solidity and Network Config
| **Settings**         | **Value**       |
| -------------------- | --------------- |
| Solidity: version    | 0.8.28          |
| Solidity: optimized  | true            |
| Solidity: runs       | 1000            |
| Solidity: viaIR      | false           |
| Block Limit          | 30,000,000      |
| L1 Base Fee Per Byte | 0 gwei          |
| L2 Gas Price         | 0.01000 gwei    |
| Token Price          | 3720.00 usd/eth |
| Network              | ARBITRUM        |
| Toolchain            | hardhat         |

