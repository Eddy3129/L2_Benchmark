## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max |     Avg | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------: | ----: | ---------: |
| **AdvancedToken**           |         |         |         |       |            |
|        *blacklist*          |  47,341 |  47,353 |  47,352 |    47 | 0.00863132 |
|        *pause*              |       - |       - |  27,743 |    47 | 0.00505699 |
|        *unblacklist*        |  25,415 |  25,427 |  25,426 |    46 | 0.00463465 |
|        *unpause*            |       - |       - |  27,721 |    46 | 0.00505298 |
| **BasicToken**              |         |         |         |       |            |
|        *approve*            |  26,506 |  46,406 |  34,786 |    46 | 0.00634079 |
|        *burn*               |  33,808 |  33,832 |  33,809 |    46 | 0.00616270 |
|        *mint*               |  36,693 |  53,817 |  40,750 |    93 | 0.00742791 |
|        *transfer*           |  34,486 |  51,610 |  35,230 |    46 | 0.00642172 |
| **MultiSigWallet**          |         |         |         |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |  63,417 |   139 | 0.01155965 |
|        *executeTransaction* |  70,275 |  70,287 |  70,286 |    46 | 0.01281173 |
|        *revokeConfirmation* |  32,296 |  35,581 |  35,509 |    46 | 0.00647258 |
|        *submitTransaction*  |  81,380 | 101,352 |  85,260 |    48 | 0.01554119 |
| **MyNFT**                   |         |         |         |       |            |
|        *approve*            |  48,655 |  48,679 |  48,678 |    46 | 0.00887303 |
|        *batchMint*          |       - |       - | 199,119 |     1 | 0.03629541 |
|        *safeMint*           |  61,562 |  95,762 |  71,491 |    93 | 0.01303138 |
|        *transferFrom*       |  38,426 |  55,526 |  39,507 |    47 | 0.00720134 |
| **SimpleAuction**           |         |         |         |       |            |
|        *auctionEnd*         |       - |       - |  62,830 |     2 | 0.01145265 |
|        *bid*                |  40,267 |  69,074 |  48,623 |    95 | 0.00886300 |
|        *withdraw*           |  23,509 |  28,560 |  25,642 |    45 | 0.00467402 |
| **SimpleStaking**           |         |         |         |       |            |
|        *exit*               |       - |       - | 153,355 |     1 | 0.02795355 |
|        *getReward*          |  67,287 | 120,587 |  77,424 |    46 | 0.01411285 |
|        *stake*              | 126,368 | 143,468 | 133,372 |    48 | 0.02431105 |
|        *withdraw*           |  72,768 |  81,168 |  80,985 |    46 | 0.01476195 |

## Deployments
|                    | Min | Max  |       Avg | Block % |    usd avg |
| :----------------- | --: | ---: | --------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |   973,081 |   3.2 % | 0.17737320 |
| **BasicToken**     |   - |    - |   768,883 |   2.6 % | 0.14015199 |
| **MultiSigWallet** |   - |    - | 1,262,755 |   4.2 % | 0.23017498 |
| **MyNFT**          |   - |    - | 1,186,380 |     4 % | 0.21625335 |
| **SimpleAuction**  |   - |    - |   412,278 |   1.4 % | 0.07515003 |
| **SimpleStaking**  |   - |    - |   772,065 |   2.6 % | 0.14073201 |

## Solidity and Network Config
| **Settings**        | **Value**       |
| ------------------- | --------------- |
| Solidity: version   | 0.8.28          |
| Solidity: optimized | true            |
| Solidity: runs      | 1000            |
| Solidity: viaIR     | false           |
| Block Limit         | 30,000,000      |
| L1 Gas Price        | 0.04900 gwei    |
| Token Price         | 3720.00 usd/eth |
| Network             | ETHEREUM        |
| Toolchain           | hardhat         |

