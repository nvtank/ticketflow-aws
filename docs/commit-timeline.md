# Commit dates and reconstructed timeline

On 23/10/2026 the user replaced the original real-time commit policy with simulated author/committer dates matching the project plan. These dates are schedule metadata, not evidence of when the work or tests actually happened. Source trees and author/committer identities were preserved.

| Phase | Simulated dates (Asia/Ho_Chi_Minh) |
| ----- | ---------------------------------- |
| 1     | 20–23/09/2026                      |
| 2     | 24–28/09/2026                      |
| 3     | 29/09–03/10/2026                   |
| 4     | 04–10/10/2026                      |
| 5     | 11–14/10/2026                      |
| 6     | 15–18/10/2026                      |
| 7     | 19–22/10/2026                      |

## Preserved original history

Five remote `archive/real-20261023/...` branches retain the original commit objects, dates and signatures. Rewritten commits have new hashes and cannot retain signatures covering the original objects. GitHub PR creation/merge timestamps remain real. Tests are reported using actual execution dates in progress.md.

| Branch                     | Original tip retained in archive           | Rewritten tip                              |
| -------------------------- | ------------------------------------------ | ------------------------------------------ |
| develop                    | `50d9543c82bb82560a9f926651f2e505ea918b3f` | `2d40747794666032693ebe0b8dd94d909575487e` |
| feature/phase-1-foundation | `88a6bfa59d0654a0fb2a4e34085ee96f7131c82a` | `44ca7a9396c80f0bb5b070c4d330a80d750dfed5` |
| feature/phase-2-auth       | `340bc50ef74a897642e86c501d85354d50d48058` | `b651759452b1aae3d178c72bbe573ee11a1d95ef` |
| feature/phase-3-events     | `8fad82dabe2c3e0b45db26cd6c7af8100ce53280` | `ff4c12b9acb546d4c9d921b4ff8844ac3ecc0e68` |
| main                       | `10b5b2a42c0ac8773cadeb515fa52a10f706a4dd` | `65b475fccbcb2ecbf3642994cdd6d05f38f583a6` |

The rewrite included the newest Phase 3/develop/main merge commits, verified remote leases and updated all five refs in one atomic push. No source changes were dropped. Phase 4 continues from the rewritten Phase 3 ancestry; its first three commits were reconstructed, subsequent commits are explicitly created with simulated dates.

Full old/new mapping: [commit-timeline-map.csv](commit-timeline-map.csv). Applied metadata and the approved preview are also kept at `.local/timeline-applied.json` and `.local/timeline-preview.md` in the working environment. These files contain Git metadata, no credentials. Original archived branch names use the complete branch path, for example `archive/real-20261023/feature/phase-3-events`.
