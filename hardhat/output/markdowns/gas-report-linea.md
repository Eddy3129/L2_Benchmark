## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max |     Avg | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------: | ----: | ---------: |
| **AdvancedToken**           |         |         |         |       |            |
|        *blacklist*          |  47,341 |  47,353 |  47,352 |    47 |      **△** |
|        *pause*              |       - |       - |  27,743 |    47 |      **△** |
|        *unblacklist*        |  25,415 |  25,427 |  25,426 |    46 |      **△** |
|        *unpause*            |       - |       - |  27,721 |    46 |      **△** |
| **BasicToken**              |         |         |         |       |            |
|        *approve*            |  26,506 |  46,406 |  34,786 |    46 |      **△** |
|        *burn*               |  33,808 |  33,832 |  33,809 |    46 |      **△** |
|        *mint*               |  36,693 |  53,817 |  40,750 |    93 |      **△** |
|        *transfer*           |  34,486 |  51,610 |  35,230 |    46 |      **△** |
| **MultiSigWallet**          |         |         |         |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |  63,417 |   139 |      **△** |
|        *executeTransaction* |  70,275 |  70,287 |  70,286 |    46 |      **△** |
|        *revokeConfirmation* |  32,296 |  35,581 |  35,509 |    46 |      **△** |
|        *submitTransaction*  |  81,380 | 101,352 |  85,260 |    48 |      **△** |
| **MyNFT**                   |         |         |         |       |            |
|        *approve*            |  48,655 |  48,679 |  48,678 |    46 |      **△** |
|        *batchMint*          |       - |       - | 199,119 |     1 | 0.00000001 |
|        *safeMint*           |  61,562 |  95,762 |  71,491 |    93 |      **△** |
|        *transferFrom*       |  38,426 |  55,526 |  39,507 |    47 |      **△** |
| **SimpleAuction**           |         |         |         |       |            |
|        *auctionEnd*         |       - |       - |  62,830 |     2 |      **△** |
|        *bid*                |  40,267 |  69,074 |  48,623 |    95 |      **△** |
|        *withdraw*           |  23,509 |  28,560 |  25,642 |    45 |      **△** |
| **SimpleStaking**           |         |         |         |       |            |
|        *exit*               |       - |       - | 153,355 |     1 |      **△** |
|        *getReward*          |  67,287 | 120,587 |  77,424 |    46 |      **△** |
|        *stake*              | 126,368 | 143,468 | 133,372 |    48 |      **△** |
|        *withdraw*           |  72,768 |  81,168 |  80,985 |    46 |      **△** |

## Deployments
|                    | Min | Max  |       Avg | Block % |    usd avg |
| :----------------- | --: | ---: | --------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |   973,081 |   3.2 % | 0.00000003 |
| **BasicToken**     |   - |    - |   768,883 |   2.6 % | 0.00000002 |
| **MultiSigWallet** |   - |    - | 1,262,755 |   4.2 % | 0.00000003 |
| **MyNFT**          |   - |    - | 1,186,392 |     4 % | 0.00000003 |
| **SimpleAuction**  |   - |    - |   412,278 |   1.4 % | 0.00000001 |
| **SimpleStaking**  |   - |    - |   772,065 |   2.6 % | 0.00000002 |

## Solidity and Network Config
| **Settings**        | **Value**       |
| ------------------- | --------------- |
| Solidity: version   | 0.8.28          |
| Solidity: optimized | true            |
| Solidity: runs      | 1000            |
| Solidity: viaIR     | false           |
| Block Limit         | 30,000,000      |
| L1 Gas Price        | 0.00000 gwei    |
| Token Price         | 3720.00 usd/eth |
| Network             | ETHEREUM        |
| Toolchain           | hardhat         |

