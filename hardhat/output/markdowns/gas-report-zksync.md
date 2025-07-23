## Methods
| **Symbol** | **Meaning**                                                                              |
| :--------: | :--------------------------------------------------------------------------------------- |
|    **◯**   | Execution gas for this method does not include intrinsic gas overhead                    |
|    **△**   | Cost was non-zero but below the precision setting for the currency display (see options) |

|                             |     Min |     Max |     Avg | Calls |    usd avg |
| :-------------------------- | ------: | ------: | ------: | ----: | ---------: |
| **AdvancedToken**           |         |         |         |       |            |
|        *blacklist*          |  47,341 |  47,353 |  47,352 |    47 | 0.00796195 |
|        *pause*              |       - |       - |  27,743 |    47 | 0.00466482 |
|        *unblacklist*        |  25,415 |  25,427 |  25,426 |    46 | 0.00427523 |
|        *unpause*            |       - |       - |  27,721 |    46 | 0.00466112 |
| **BasicToken**              |         |         |         |       |            |
|        *approve*            |  26,506 |  46,406 |  34,786 |    46 | 0.00584906 |
|        *burn*               |  33,808 |  33,832 |  33,809 |    46 | 0.00568478 |
|        *mint*               |  36,693 |  53,817 |  40,750 |    93 | 0.00685187 |
|        *transfer*           |  34,486 |  51,610 |  35,230 |    46 | 0.00592371 |
| **MultiSigWallet**          |         |         |         |       |            |
|        *confirmTransaction* |  57,501 |  74,613 |  63,417 |   139 | 0.01066319 |
|        *executeTransaction* |  70,275 |  70,287 |  70,286 |    46 | 0.01181817 |
|        *revokeConfirmation* |  32,296 |  35,581 |  35,509 |    46 | 0.00597063 |
|        *submitTransaction*  |  81,380 | 101,352 |  85,260 |    48 | 0.01433596 |
| **MyNFT**                   |         |         |         |       |            |
|        *approve*            |  48,655 |  48,679 |  48,678 |    46 | 0.00818491 |
|        *batchMint*          |       - |       - | 199,119 |     1 | 0.03348067 |
|        *safeMint*           |  61,562 |  95,762 |  71,491 |    93 | 0.01202078 |
|        *transferFrom*       |  38,426 |  55,526 |  39,507 |    47 | 0.00664287 |
| **SimpleAuction**           |         |         |         |       |            |
|        *auctionEnd*         |       - |       - |  62,830 |     2 | 0.01056449 |
|        *bid*                |  40,267 |  69,074 |  48,623 |    95 | 0.00817567 |
|        *withdraw*           |  23,509 |  28,560 |  25,642 |    45 | 0.00431155 |
| **SimpleStaking**           |         |         |         |       |            |
|        *exit*               |       - |       - | 153,355 |     1 | 0.02578572 |
|        *getReward*          |  67,287 | 120,587 |  77,424 |    46 | 0.01301838 |
|        *stake*              | 126,368 | 143,468 | 133,372 |    48 | 0.02242570 |
|        *withdraw*           |  72,768 |  81,168 |  80,985 |    46 | 0.01361714 |

## Deployments
|                    | Min | Max  |       Avg | Block % |    usd avg |
| :----------------- | --: | ---: | --------: | ------: | ---------: |
| **AdvancedToken**  |   - |    - |   973,081 |   3.2 % | 0.16361773 |
| **BasicToken**     |   - |    - |   768,883 |   2.6 % | 0.12928306 |
| **MultiSigWallet** |   - |    - | 1,262,755 |   4.2 % | 0.21232468 |
| **MyNFT**          |   - |    - | 1,186,392 |     4 % | 0.19948470 |
| **SimpleAuction**  |   - |    - |   412,278 |   1.4 % | 0.06932207 |
| **SimpleStaking**  |   - |    - |   772,065 |   2.6 % | 0.12981810 |

## Solidity and Network Config
| **Settings**        | **Value**       |
| ------------------- | --------------- |
| Solidity: version   | 0.8.28          |
| Solidity: optimized | true            |
| Solidity: runs      | 1000            |
| Solidity: viaIR     | false           |
| Block Limit         | 30,000,000      |
| L2 Gas Price        | 0.04520 gwei    |
| Token Price         | 3720.00 usd/eth |
| Network             | ETHEREUM        |
| Toolchain           | hardhat         |

