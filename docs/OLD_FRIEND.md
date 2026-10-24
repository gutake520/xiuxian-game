# 故人之子：状态与后续接续

入口：三次炼气授业完成且达到筑基后，在师尊授业中直接开启。没有额外筑基材料任务。

`save.oldFriend` 持有本轮任务唯一 ID、宗门及师父快照、八个选择、线索 flags、可回看的 journal 与阶段。`search` 时只在对应地点（丰原镇 monsters / 望川岭 foundation）四处走走，独立 20% 判定；成功优先呈现任务消息，不消耗奇遇额度。`ready` 等待选择；`after` 等待阅读并继续，刷新不会跳过；`duel` 可在照夜台重试交锋；`done` 为本卷完成。

照夜台在第七节点解锁，属于望川岭内部独立地图地点。师父节点须回师尊授业；打探节点从四处走走中的手札处理；最终两节点须到照夜台。

## 后续接口

`oldFriendReunion(save, realm)` 在本卷完成且 realm 与预留境界吻合时，返回 followup 的深拷贝，否则 null。当前不自动开放金丹/元婴内容，不改变境界突破或主线地图锁。

`followup` 字段：version、characterId（jiang-jibai）、route（golden-core/nascent-soul）、reunionRealm（金丹/元婴）、locationId（dongxia/null）、status（reserved）、reason、master、sect、choices、flags、completedAt。

金丹：真实旧录 + 能说清来由的证词/手记 + 有一定相互信任；补阵另需草图或师父援助。担保线需真实担保与证据。其余落入元婴重逢，保留强制告别、隐瞒真相、公开追捕等具体原因供后续差异台词使用。不要重新随机选路线，不要把元婴线直接当作恶人结局。

后续实现应另增阶段状态，引用本次 flags：药账是否代偿/承诺、证人获救/伤残、追捕是否获知行踪、是否隐瞒父亲旧事、师父信件/担保、是否答应取出残魂，以及八个原始选择。不同路线允许复用未来场景，但不可吞掉历史选择。

离宗 `leaveSect` 删除 masterTeaching 和 oldFriend，包括未完成委托、已得线索、结局和未来重逢预留。再次加入同宗或异宗均从炼气授业重做。原有十层救师主线 foundationStory 不属于这条授业线，不清除。

交锋是有退路的非致命剧情战，无经验/掉落；败退仍可重试。单次任务 ID、阶段和地点都校验，重复提交不能重复扣资源。护身符、灵石为真实消耗；故事证物存在 flags，不占背包，离宗随任务清空。

## 复命尾声

八个选择结束后的 `done` 保留原有重逢接口；`reportedAt` 未设置时，任务指引要求回师尊授业复命。`reportOldFriend(save,id,'master',now)` 根据既定 route 播放《归山 · 灯下有人》或《归山 · 门前旧阶》，写入 reportedAt、reportTitle 和第九段手札；不更改八个选择、结局或 followup，也不消耗奇遇次数。旧版已完成存档无需迁移即可补看，已复命不能重复提交，正文和手札可重读；离宗仍一并清空。
