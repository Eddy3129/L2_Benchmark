## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max |     Avg | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------: | ----: | ---------: |
| **AdvancedToken**           |         |         |         |       |            |
|        *blacklist*          |  47,341 |  47,353 |  47,352 |    47 | 0.00044037 |
|        *pause*              |       - |       - |  27,743 |    47 | 0.00025801 |
|        *unblacklist*        |  25,415 |  25,427 |  25,426 |    46 | 0.00023646 |
|        *unpause*            |       - |       - |  27,721 |    46 | 0.00025781 |
| **BasicToken**              |         |         |         |       |            |
|        *approve*            |  26,506 |  46,406 |  34,786 |    46 | 0.00032351 |
|        *burn*               |  33,808 |  33,832 |  33,809 |    46 | 0.00031442 |
|        *mint*               |  36,693 |  53,817 |  40,750 |    93 | 0.00037898 |
|        *transfer*           |  34,486 |  51,610 |  35,230 |    46 | 0.00032764 |
| **MultiSigWallet**          |         |         |         |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |  63,417 |   139 | 0.00058978 |
|        *executeTransaction* |  70,275 |  70,287 |  70,286 |    46 | 0.00065366 |
|        *revokeConfirmation* |  32,296 |  35,581 |  35,509 |    46 | 0.00033023 |
|        *submitTransaction*  |  81,380 | 101,352 |  85,260 |    48 | 0.00079292 |
| **MyNFT**                   |         |         |         |       |            |
|        *approve*            |  48,655 |  48,679 |  48,678 |    46 | 0.00045271 |
|        *batchMint*          |       - |       - | 199,119 |     1 | 0.00185181 |
|        *safeMint*           |  61,562 |  95,762 |  71,491 |    93 | 0.00066487 |
|        *transferFrom*       |  38,426 |  55,526 |  39,507 |    47 | 0.00036742 |
| **SimpleAuction**           |         |         |         |       |            |
|        *auctionEnd*         |       - |       - |  62,830 |     2 | 0.00058432 |
|        *bid*                |  40,267 |  69,074 |  48,623 |    95 | 0.00045219 |
|        *withdraw*           |  23,509 |  28,560 |  25,642 |    45 | 0.00023847 |
| **SimpleStaking**           |         |         |         |       |            |
|        *exit*               |       - |       - | 153,355 |     1 | 0.00142620 |
|        *getReward*          |  67,287 | 120,587 |  77,424 |    46 | 0.00072004 |
|        *stake*              | 126,368 | 143,468 | 133,372 |    48 | 0.00124036 |
|        *withdraw*           |  72,768 |  81,168 |  80,985 |    46 | 0.00075316 |

## Deployments
|                    | Min | Max  |       Avg | Block % |    usd avg |
| :----------------- | --: | ---: | --------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |   973,081 |   3.2 % | 0.00904965 |
| **BasicToken**     |   - |    - |   768,883 |   2.6 % | 0.00715061 |
| **MultiSigWallet** |   - |    - | 1,262,755 |   4.2 % | 0.01174362 |
| **MyNFT**          |   - |    - | 1,186,392 |     4 % | 0.01103345 |
| **SimpleAuction**  |   - |    - |   412,278 |   1.4 % | 0.00383419 |
| **SimpleStaking**  |   - |    - |   772,065 |   2.6 % | 0.00718020 |

## Solidity and Network Config
| **Settings**        | **Value**       |
| ------------------- | --------------- |
| Solidity: version   | 0.8.28          |
| Solidity: optimized | true            |
| Solidity: runs      | 1000            |
| Solidity: viaIR     | false           |
| Block Limit         | 30,000,000      |
| L2 Gas Price        | 0.00250 gwei    |
| Token Price         | 3720.00 usd/eth |
| Network             | ETHEREUM        |
| Toolchain           | hardhat         |

