import { parseArticle } from "../article-parser";
import type { ArticleAST } from "../article-ast";
import type {
  AssetOrientation, AssetSemanticRole, AssetUnderstandingMap,
  EditorialArticleType, ShotType, VisualQuality,
} from "../editorial";

export interface RealisticEditorialAcceptanceCaseV2 {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  article: ArticleAST;
  assetUnderstanding: AssetUnderstandingMap;
  previewUrlByAssetId: Record<string, string>;
  humanReviewFocus: string[];
}

interface VisualSpec {
  alt: string;
  scene: string;
  shotType: ShotType;
  orientation: AssetOrientation;
  peopleCount: number;
  roles: AssetSemanticRole[];
  kind: string;
  subjects: string[];
  quality?: VisualQuality;
}

interface SectionSpec {
  heading: string;
  focus: string;
  detail: string;
  extra?: string;
}

interface CaseSpec {
  id: string;
  category: string;
  articleType: EditorialArticleType;
  title: string;
  opening: string;
  context: string;
  sections: SectionSpec[];
  closing: string;
  visuals: VisualSpec[];
  humanReviewFocus: string[];
}

const visual = (
  alt: string, scene: string, shotType: ShotType, orientation: AssetOrientation,
  peopleCount: number, roles: AssetSemanticRole[], kind: string, subjects: string[],
  quality: VisualQuality = "high",
): VisualSpec => ({ alt, scene, shotType, orientation, peopleCount, roles, kind, subjects, quality });

const specs: CaseSpec[] = [
  {
    id: "welcome-journey", category: "迎新", articleType: "welcome",
    title: "跨越山海来报到：2026 新生入校的一天",
    opening: "清晨七点，第一批新生拖着行李走进校门。迎新不是一组整齐摆拍，而是一条从抵达到安顿、从陌生到建立连接的时间线；镜头需要同时看见校园尺度、服务细节和真实表情。",
    context: "迎新叙事强调抵达、协作与归属感，图像承担推进时间和转换场景的任务",
    sections: [
      { heading: "第一站，从一张地图开始", focus: "校门前的咨询台把报到路线拆成宿舍、学院和服务点三条清晰路径。志愿者没有只递出一张纸，而是根据行李数量、同行家长和报到材料逐项确认，让第一次进入校园的人能迅速判断下一步。", detail: "广角画面保留校门、路牌与人流方向，近景则落在手绘地图和被反复标记的楼宇编号上。两种景别放在同一节，才能让读者既知道人在哪里，也看见服务如何发生。" },
      { heading: "行李抵达之前，接力已经开始", focus: "接驳车停稳后，学生志愿者按楼栋分组搬运行李。有人核对姓名，有人固定易碎物品，还有人提前联系宿舍值班同学，整个过程像一场不需要口号的协作训练。", detail: "人物中景记录交接动作，手部特写补充行李标签和防雨套等信息。画面不追求所有人看向镜头，而保留弯腰、指路和短暂等待，让秩序感来自真实行动。" },
      { heading: "校园卡背后的十分钟", focus: "学院报到点把身份核验、材料提交和校园卡激活串成连续流程。新生只需在一个窗口完成确认，遇到信息不一致时则由专人带到侧台处理，主队列因此保持稳定。", detail: "镜头从队伍全景切到屏幕和卡片细节，再回到新生完成激活后的表情。这样的顺序比平均铺开图片更能解释流程，也让技术系统与人的体验形成联系。" },
      { heading: "夜色里的最后一班岗", focus: "傍晚后仍有列车陆续抵达，夜间服务点保留热水、充电、简餐和临时住宿咨询。白天的热闹收束成更克制的陪伴，值班同学用一张表记录尚未完成报到的人。", detail: "夜景需要保留灯光和环境，而不是把人物裁成孤立头像。横向大图承担时间转换，较小的服务细节随后出现，节奏自然从动态转向安静。" },
      { heading: "在宿舍门口说一声到啦", focus: "完成报到的新生把第一条校园消息发给家人，室友们开始交换家乡和专业信息。迎新真正的结尾不在流程表上，而在一群原本陌生的人坐下来，第一次讨论未来几年的共同生活。", detail: "结尾保留宿舍走廊的生活细节，再用集体合影建立确定的归属感。它回应开场的大尺度校门，但把观看距离拉近，让整篇文章落到具体的人。" },
    ],
    closing: "从校门到宿舍，迎新服务完成的是路线，也是关系的建立。镜头最后停在新生与志愿者的合影上：有人仍抱着文件袋，有人刚放下行李，每一种不够整齐的姿态都属于真实的第一天。",
    visuals: [
      visual("晨光中的校门与报到人流", "校门抵达", "wide", "landscape", 36, ["hero-candidate"], "campus-gate", ["新生", "家长", "校门"]),
      visual("志愿者指向迎新地图", "路线咨询", "medium", "landscape", 4, ["supporting"], "map-guidance", ["志愿者", "新生", "地图"]),
      visual("手绘地图与楼宇标记", "路线咨询", "detail", "landscape", 0, ["evidence"], "map-detail", ["地图", "楼宇编号"]),
      visual("接驳点行李接力", "行李接驳", "wide", "landscape", 18, ["supporting"], "luggage-relay", ["志愿者", "行李"]),
      visual("防雨行李标签特写", "行李接驳", "detail", "square", 0, ["evidence"], "luggage-tag", ["行李标签"]),
      visual("学院报到窗口全景", "身份核验", "wide", "landscape", 20, ["supporting"], "checkin-hall", ["新生", "工作人员"]),
      visual("校园卡激活界面", "身份核验", "close-up", "landscape", 1, ["evidence"], "card-activation", ["校园卡", "屏幕"]),
      visual("夜间服务站值班", "夜间守候", "wide", "landscape", 8, ["supporting"], "night-service", ["志愿者", "服务站"]),
      visual("宿舍走廊初次相识", "宿舍相识", "medium", "landscape", 6, ["supporting"], "dorm-meeting", ["新生", "宿舍"]),
      visual("新生与志愿者报到日合影", "完成报到", "group", "landscape", 24, ["closing-candidate", "supporting"], "welcome-group", ["新生", "志愿者"]),
    ],
    humanReviewFocus: ["迎新时间线是否成立", "双图是否有主次", "夜景到合影的收束是否自然"],
  },
  {
    id: "competition-climax", category: "竞赛", articleType: "competition",
    title: "从故障到冠军：机器人挑战赛决赛十二小时",
    opening: "决赛日的故事并不是奖杯照片开始的。凌晨测试时，机器人转向模块出现间歇故障，团队必须在正式检录前定位原因。文章用时间节点、动作细节和关键数据建立紧张感，再把视觉高潮留给最后一次越障。",
    context: "竞赛叙事依靠倒计时、证据细节与视觉高潮推进，奖项只在完整过程之后出现",
    sections: [
      { heading: "06:40，异常信号出现", focus: "第一轮自检中，左侧编码器反馈值突然漂移。队员先冻结软件版本，再交换传感器和线束进行交叉验证，避免在压力下同时改动多个变量。十分钟后，问题范围被缩小到接插件。", detail: "赛场广角交代时间和环境，示波器与接插件特写则提供证据。把两者编为主次明确的一组，读者能理解紧张从何而来，而不是只看到一群人围在设备旁。" },
      { heading: "09:15，把策略写回现场", focus: "修复硬件后，团队没有立即追求最快速度，而是先降低加速度完成稳定性测试。控制组根据场地摩擦差异重新设定阈值，机械组同步检查轮胎磨损，记录员将每次变化写入版本表。", detail: "中景人物照关注协作关系，屏幕细节显示策略参数。图像之间不是简单并排，而是从决策者到证据的视线转移，让技术判断可以被复盘。" },
      { heading: "14:30，越过最后一道障碍", focus: "正式轮次开始后，机器人在前两段保持保守速度，到连续坡面才释放预设性能。最后一次转向出现轻微摆动，但补偿算法及时拉回轨迹，整套任务在规定时间内完成。", detail: "视觉高潮应使用一张动作主图，再以近景补充队员反应。若所有图片被压成同样大小，关键瞬间会失去重量，比赛节奏也会变成平铺。", extra: "| 决赛指标 | 结果 |\n| --- | --- |\n| 完成时间 | 4分18秒 |\n| 有效任务 | 9项 |\n| 故障恢复 | 1次 |" },
      { heading: "结果公布前的安静十分钟", focus: "完成任务后，团队把机器人推回维护区，没有提前庆祝。队员重新核对裁判记录和设备状态，也向相邻队伍分享备用接插件。紧张的节奏在这里短暂停顿，为结果出现留出空间。", detail: "一张克制的中景比连续欢呼更有叙事价值。它显示竞赛文化不仅是胜负，还包括工程纪律、对规则的尊重以及在高压环境中保持开放。" },
      { heading: "奖杯属于每一次可复现的修正", focus: "冠军公布后，团队把奖杯放在机器人旁，而不是遮住设备。指导教师在复盘会上要求所有人解释自己做过的改动，确保成功能够被下一届同学理解和复现。", detail: "结尾先呈现奖杯与设备细节，再用团队合影完成情绪释放。奖杯是证据，合影是关系；两者的观看顺序决定文章最终落在荣誉还是成长。" },
    ],
    closing: "十二小时里，真正改变结果的不是一次灵感，而是一连串可验证的判断。团队带走冠军，也留下完整日志、故障样件和新的检查清单，这些比成绩更接近工程竞赛的长期价值。",
    visuals: [
      visual("清晨赛场与待检机器人", "决赛检录", "wide", "landscape", 30, ["hero-candidate"], "arena-wide", ["机器人", "赛场"]),
      visual("队员围绕故障设备排查", "故障排查", "medium", "landscape", 5, ["supporting"], "team-debug", ["队员", "机器人"]),
      visual("编码器波形与接插件", "故障排查", "detail", "landscape", 1, ["evidence"], "signal-detail", ["示波器", "接插件"]),
      visual("控制组调整策略参数", "策略重写", "medium", "landscape", 3, ["supporting"], "strategy-screen", ["队员", "控制界面"]),
      visual("版本记录表近景", "策略重写", "detail", "square", 0, ["evidence"], "version-log", ["版本记录"]),
      visual("机器人高速越过坡面", "决赛高潮", "wide", "landscape", 14, ["supporting", "evidence"], "robot-action", ["机器人", "障碍"]),
      visual("队员注视最后一次转向", "决赛高潮", "close-up", "landscape", 4, ["supporting"], "team-reaction", ["队员"]),
      visual("维护区等待结果", "等待结果", "medium", "landscape", 7, ["supporting"], "quiet-pit", ["队员", "维护区"]),
      visual("奖杯与机器人结构细节", "冠军复盘", "detail", "landscape", 0, ["evidence"], "trophy-detail", ["奖杯", "机器人"]),
      visual("冠军团队与机器人合影", "冠军公布", "group", "landscape", 16, ["closing-candidate", "supporting"], "champion-group", ["团队", "机器人", "奖杯"]),
    ],
    humanReviewFocus: ["倒计时节奏是否可感知", "越障主图是否形成高潮", "指标表是否仍是少量卡面"],
  },
  {
    id: "person-award-portrait", category: "人物获奖", articleType: "person-profile",
    title: "人物专访｜把冷门问题做成长期答案",
    opening: "获得青年科学家奖后，林岚没有先谈奖项，而是从实验室里一块用了七年的样件讲起。人物稿需要给肖像、原话与工作现场不同的重量，让读者看到一个研究方向如何被耐心建立。",
    context: "人物叙事以肖像建立关系，以原话制造停顿，以工作细节证明人物而不是堆叠荣誉",
    sections: [
      { heading: "一块旧样件，是问题的起点", focus: "博士阶段的一次失效测试让林岚意识到，常用模型无法解释极端温差下的材料变化。她保留了那块开裂样件，也保留了当时写满疑问的实验本，之后的研究一直围绕这个缺口展开。", detail: "人物全身工作照与样件细节不应被放进同一种卡片。前者说明人与环境的关系，后者提供事实；留白和尺度差异能让两条信息各自成立。" },
      { heading: "慢下来，建立自己的测量方法", focus: "团队最初两年没有发布醒目的结果，而是重新标定传感器、设计夹具并验证重复性。林岚要求学生把失败数据也纳入周会，因为只有知道偏差来自哪里，才能判断结论是否可信。", detail: "实验室中景保留师生交流，手写记录采用近景。画面之间的节奏应比竞赛稿更安静，让阅读时间贴近人物处理问题的方式。", extra: "> “研究不是把每次实验都变成好消息，而是让每个数字都能回答它为什么在这里。”" },
      { heading: "学生不是项目里的执行者", focus: "她会在组会前把问题分成事实、假设和待验证三栏，鼓励学生先说不同意见。遇到进度停滞，她更关心判断过程是否完整，而不是用自己的答案替代年轻研究者的探索。", detail: "肖像与引语组成一个独立节点，但不需要厚重边框。人物的视线、自然光和原话已经足够形成强调，额外装饰反而会削弱可信度。" },
      { heading: "奖项之后，仍回到同一张工作台", focus: "颁奖结束第二天，林岚照常参加样件讨论。她把奖牌留在办公室，把最新测试曲线带进实验室。对她而言，荣誉确认的是一个方向值得继续，而不是宣布问题已经结束。", detail: "颁奖现场只作为时间节点出现，真正的主画面仍是工作现场。这样的选择避免人物稿滑向荣誉通稿，也让奖项与长期行动保持因果关系。" },
      { heading: "把答案交给下一代研究者", focus: "团队正在整理开放数据和操作手册，希望后来者不必重复最早的校准弯路。林岚也把那块旧样件交给新生讲解，让一个具体物件继续提醒所有人：问题往往比答案活得更久。", detail: "结尾用师生合影而非个人领奖照，把叙事从单个人扩展到共同体。它回应开头的肖像，却把视觉中心从个人移向关系和传承。" },
    ],
    closing: "奖项为一段工作标注了日期，却没有替它画上句号。镜头离开实验室时，工作台上的样件仍在等待下一轮测试，师生已经围在白板前讨论新的变量。",
    visuals: [
      visual("林岚在实验室窗边的自然光肖像", "人物开场", "portrait", "portrait", 1, ["hero-candidate", "portrait"], "scientist-portrait", ["林岚"]),
      visual("林岚在工作台检查样件", "问题起点", "medium", "portrait", 1, ["portrait", "supporting"], "portrait-work", ["林岚", "样件"]),
      visual("开裂样件与旧实验本", "问题起点", "detail", "landscape", 0, ["evidence"], "sample-notebook", ["样件", "实验本"]),
      visual("师生共同标定传感器", "测量方法", "medium", "landscape", 4, ["supporting"], "lab-mentoring", ["林岚", "学生"]),
      visual("三栏式手写周会记录", "测量方法", "detail", "square", 0, ["evidence"], "meeting-notes", ["周会记录"]),
      visual("林岚在组会中倾听学生", "学生培养", "portrait", "portrait", 1, ["portrait", "supporting"], "listening-portrait", ["林岚"]),
      visual("学生在白板前解释假设", "学生培养", "medium", "landscape", 3, ["supporting"], "whiteboard-dialogue", ["学生", "白板"]),
      visual("青年科学家奖颁奖现场", "奖项节点", "wide", "landscape", 12, ["evidence"], "award-stage", ["林岚", "颁奖嘉宾"]),
      visual("开放数据手册与旧样件", "研究传承", "detail", "landscape", 0, ["evidence"], "open-manual", ["数据手册", "样件"]),
      visual("林岚与课题组在白板前合影", "研究传承", "group", "landscape", 9, ["closing-candidate", "supporting"], "mentor-group", ["林岚", "学生"]),
    ],
    humanReviewFocus: ["肖像是否保持人物尺度", "引语是否形成安静停顿", "颁奖照是否没有压过工作现场"],
  },
  {
    id: "performance-night", category: "演出", articleType: "performance",
    title: "毕业音乐会：灯光落下之前，我们听见彼此",
    opening: "这场毕业音乐会没有把节目单当作文章目录。叙事从空舞台、后台呼吸和第一次合奏开始，经过独奏与群像的视觉高潮，最后回到谢幕后的安静。舞台图像需要通栏和留白，而不是被平均装进卡片。",
    context: "演出叙事靠光线、观看距离与声部转换形成节奏，海报只负责识别，舞台主图承担情绪",
    sections: [
      { heading: "开场前，舞台还没有名字", focus: "观众入场前，舞台只亮着工作灯。调音师逐一确认话筒，演奏者在侧幕后用很轻的声音对拍，毕业生把写有同学姓名的谱页重新夹好。", detail: "一张宽幅空舞台先建立空间，后台细节随后出现。两张图之间的留白像正式演奏前的停顿，让读者先进入场域，而不是立刻被高密度信息包围。" },
      { heading: "第一声合奏，从呼吸开始", focus: "指挥抬手后，弦乐声部没有抢先进入，所有人先完成一次共同呼吸。摄影机从观众席后方保留整个舞台，再切到乐手相互确认的眼神，声音关系被转译为视觉关系。", detail: "主图使用横向全景，小图补充近景，不做机械的等宽双栏。远近变化能够模拟聆听时注意力的移动，也让段落从空间走向人物。" },
      { heading: "独奏不是一个人的时刻", focus: "独奏者站到光束中央时，其他声部仍在用克制的音量支撑旋律。她在最后一个长音结束后先看向指挥，再转向同伴；掌声到来之前，舞台上出现了短暂而完整的安静。", detail: "竖版人物照需要保留身体姿态，随后用手部特写补充演奏动作。若统一裁切为横图，人物的站姿和灯光方向都会被削弱。", extra: "> “毕业不是最后一首曲子结束，而是我们终于听懂了彼此怎样进入同一个节拍。”" },
      { heading: "海报之外，演出由细节组成", focus: "设计海报上的主视觉来自排练室的一条声波曲线，但正式演出并没有重复宣传图。节目册、谱页修改和磨损的琴弓共同记录准备过程，构成舞台之外的证据。", detail: "海报采用居中竖版处理，与舞台横图形成方向对比。它应该是一处明确节点，而不是每一节都复用的装饰模板。" },
      { heading: "谢幕之后，灯光慢慢熄灭", focus: "最后一个节目结束，毕业生没有立即离场。他们把椅子重新排好，向后台工作人员道谢，又在空舞台边缘留下合影。几分钟后，工作灯再次亮起，演出回到最初的空间。", detail: "文章的情绪峰值是全体谢幕，真正的结尾却是散场后的舞台。先释放、再收静，能够让读者带着余韵离开，而不是停在庆祝姿势里。" },
    ],
    closing: "灯光落下后，音乐仍以另一种方式存在：在被翻旧的谱页、同伴的目光和一次共同呼吸里。舞台归于安静，毕业生带走了彼此倾听的方法。",
    visuals: [
      visual("音乐厅舞台与渐亮灯光", "舞台开场", "wide", "landscape", 0, ["hero-candidate"], "stage-empty", ["舞台", "灯光"]),
      visual("空舞台上的工作灯", "开场准备", "wide", "landscape", 2, ["supporting"], "stage-worklight", ["舞台", "工作人员"]),
      visual("后台夹好姓名的谱页", "开场准备", "detail", "square", 0, ["evidence"], "score-detail", ["谱页"]),
      visual("观众席后方的全体合奏", "第一次合奏", "wide", "landscape", 30, ["supporting"], "orchestra-wide", ["乐团", "指挥"]),
      visual("乐手交换眼神", "第一次合奏", "close-up", "landscape", 2, ["supporting"], "musician-glance", ["演奏者"]),
      visual("独奏者站在光束中央", "独奏时刻", "portrait", "portrait", 1, ["portrait", "supporting"], "soloist-portrait", ["独奏者"]),
      visual("琴弓与左手动作特写", "独奏时刻", "detail", "landscape", 1, ["evidence"], "instrument-detail", ["琴弓", "手部"]),
      visual("毕业音乐会主海报", "演出识别", "other", "portrait", 0, ["evidence"], "concert-poster", ["音乐会海报"]),
      visual("全体演员向观众谢幕", "谢幕高潮", "wide", "landscape", 38, ["supporting"], "curtain-call", ["演员", "观众"]),
      visual("毕业生在空舞台边缘合影", "散场余韵", "group", "landscape", 24, ["closing-candidate", "supporting"], "stage-group", ["毕业生", "舞台"]),
    ],
    humanReviewFocus: ["横向舞台与竖向独奏是否有方向对比", "海报是否只出现一次", "谢幕后是否有余韵"],
  },
  {
    id: "science-evidence", category: "科研成果", articleType: "science-technology",
    title: "低功耗感知芯片完成系统验证：从指标到真实场景",
    opening: "实验室最新完成的低功耗感知芯片，不以单个峰值参数作为结论。报道沿着设计假设、流片验证、系统联调和开放数据四层证据展开，让表格、设备细节和场景照片共同回答成果是否可靠。",
    context: "科研成果叙事以证据链、指标表和系统场景为骨架，装饰让位于可核验信息",
    sections: [
      { heading: "先回答功耗从哪里降低", focus: "团队把常驻感知任务拆成唤醒、特征提取和分类三个阶段，针对占比最高的存储访问重新设计数据路径。这个选择不是为了追逐单项纪录，而是让芯片在持续运行时保持稳定预算。", detail: "架构图与芯片显微照片承担不同证据角色。前者解释方法，后者确认实物；两者需要清晰图注和顺序，不能被同样的装饰边框掩盖。" },
      { heading: "三轮流片，保留每一次偏差", focus: "首轮样片在高温条件下出现时钟漂移，第二轮修正后又暴露封装寄生问题。团队没有删除异常点，而是将误差模型写入验证脚本，第三轮才获得跨温区一致结果。", detail: "波形近景作为主证据，测试平台全景补充环境。科研稿的图片分组依据实验关系，而不是拍摄时间相邻；图注必须说明读者正在看什么。" },
      { heading: "把芯片放进连续七天的真实任务", focus: "样片被集成到校园环境监测节点，连续运行七天并记录温湿度、振动和唤醒事件。系统在网络波动时使用本地缓存，恢复连接后再同步，避免通信状态影响核心功耗判断。", detail: "现场节点照片负责连接实验室与真实世界，后台曲线则提供运行证据。大图先建立场景，小图和表格随后解释结果，阅读顺序从问题走向数据。", extra: "| 验证项目 | 结果 | 条件 |\n| --- | --- | --- |\n| 平均功耗 | 2.8mW | 连续感知 |\n| 唤醒延迟 | 7.4ms | 室温 |\n| 连续运行 | 168小时 | 无人工重启 |" },
      { heading: "哪些结论现在还不能说", focus: "当前验证覆盖校园固定节点，但尚未包含高速移动和极端低温场景。团队在报告中明确标出适用边界，并把下一轮测试重点放在封装可靠性与跨设备一致性。", detail: "一张标注清楚的限制条件图比额外庆祝照片更重要。它让读者区分已经完成的证据和仍待回答的问题，也体现科研传播的可信度。" },
      { heading: "开放脚本，让结果可以复核", focus: "团队将测试脚本、原始数据字段说明和关键硬件接口整理成开放包，校内合作组可在相同流程下复现实验。成果因此从一次发布变成可继续使用的研究基础。", detail: "结尾不用大面积荣誉卡片，而以开放资料和团队工作照收束。技术成果最终由共同验证建立，而不是由视觉包装替代。" },
    ],
    closing: "系统验证给出的不是一句万能结论，而是一组有条件、可复核的证据。团队下一步将扩大场景和温区，所有新结果仍会沿用同一套记录方法。",
    visuals: [
      visual("芯片与完整测试平台全景", "系统验证", "wide", "landscape", 4, ["hero-candidate", "evidence"], "chip-platform", ["芯片", "测试平台"]),
      visual("低功耗数据路径架构图", "架构方法", "detail", "landscape", 0, ["evidence"], "architecture-diagram", ["芯片架构"]),
      visual("芯片显微照片", "架构方法", "close-up", "square", 0, ["evidence"], "chip-micrograph", ["芯片"]),
      visual("跨温区波形对比", "流片验证", "detail", "landscape", 0, ["evidence"], "waveform-chart", ["测试波形"]),
      visual("工程师操作温控测试平台", "流片验证", "medium", "landscape", 3, ["supporting"], "thermal-test", ["工程师", "测试平台"]),
      visual("校园环境监测节点", "真实任务", "wide", "landscape", 2, ["evidence", "supporting"], "sensor-node", ["监测节点", "校园"]),
      visual("七天运行曲线", "真实任务", "detail", "landscape", 0, ["evidence"], "runtime-chart", ["运行曲线"]),
      visual("适用边界与待测场景图", "结论边界", "detail", "landscape", 0, ["evidence"], "limits-diagram", ["限制条件"]),
      visual("开放验证资料包", "开放复核", "detail", "landscape", 0, ["evidence"], "open-data", ["脚本", "数据说明"]),
      visual("芯片验证团队在平台前合影", "共同验证", "group", "landscape", 8, ["closing-candidate", "supporting"], "research-group", ["研究团队", "测试平台"]),
    ],
    humanReviewFocus: ["证据链是否清楚", "表格是否可读但不过度卡片化", "技术蓝调是否区别于迎新和人物"],
  },
  {
    id: "practice-fieldnotes", category: "社会实践", articleType: "practice",
    title: "沿河而行：青年实践队的七天田野笔记",
    opening: "实践队没有把七天行程写成景点清单，而是围绕河道治理中的三个真实问题持续观察：雨后垃圾聚集、老旧排口识别和居民参与。文章用地图、访谈肖像与行动场景建立纪录片式叙事。",
    context: "社会实践叙事依赖地点、人物与行动的连续关系，成果必须回到居民和现场",
    sections: [
      { heading: "第一天，先画一张不完整的河道图", focus: "队员沿河步行记录排口、桥梁和生活空间，用不同符号标注无法判断的区域。地图故意保留空白，因为现场调查的第一步不是填满答案，而是知道哪些地方还没有被看见。", detail: "河道全景提供地理尺度，手绘地图细节展示方法。图片分组依据同一地点和任务，读者可以从环境进入记录工具。" },
      { heading: "雨后两小时，问题改变了形状", focus: "短时降雨后，上游漂浮物在弯道集中，晴天记录的流速判断随之失效。队员重新测量并访问保洁人员，发现清理时间与水位变化之间存在稳定窗口。", detail: "行动中景作为主图，水面细节是证据。非对称比例让人的行动与问题对象同时可见，不把实践简化为整齐合影。" },
      { heading: "访谈不只收集一句意见", focus: "居民谈到河道时，常把童年记忆、日常通行和当前气味放在一起。队员将陈述按时间和地点拆分，再邀请受访者在地图上确认，避免只截取适合报告的句子。", detail: "人物肖像与手部标记需要保留尊重的观看距离。图注说明身份和情境，不把受访者变成抽象素材。", extra: "> “河水什么时候变，我们每天从窗边就能看出来；如果你们下次再来，可以先问问早起散步的人。”" },
      { heading: "把建议变成一次可执行的试验", focus: "团队与社区共同调整垃圾收集点位置，并在两个雨天记录变化。试验没有立刻解决全部问题，但弯道处的聚集量明显下降，社区也确定了后续观察责任人。", detail: "方案图和落地现场构成前后关系，成果以可执行改变呈现，而不是用夸张数字替代过程。" },
      { heading: "离开之前，把记录留在社区", focus: "最后一天，队员将地图、访谈索引和观察表交给社区工作者，并共同补充了下一次雨后的检查路线。资料留在现场，实践才不只是团队自己的经历。", detail: "结尾先看见资料交接，再用居民与队员合影收束。画面中心从青年团队转向共同维护河道的人。" },
    ],
    closing: "七天不足以替一条河流写出结论，却足以建立一种更诚实的工作方法：反复到场、标记未知、让居民参与验证。实践队离开时，地图上仍有空白，也有下一次行动的明确坐标。",
    visuals: [
      visual("清晨河道与步行调查队", "河道踏查", "wide", "landscape", 9, ["hero-candidate"], "river-wide", ["河道", "实践队"]),
      visual("队员沿河记录排口", "地图绘制", "wide", "landscape", 5, ["supporting"], "field-mapping", ["队员", "河道"]),
      visual("保留空白的手绘河道图", "地图绘制", "detail", "landscape", 1, ["evidence"], "river-map", ["地图", "手部"]),
      visual("雨后弯道采样行动", "雨后观察", "medium", "landscape", 4, ["supporting"], "rain-sampling", ["队员", "采样器"]),
      visual("水面漂浮物聚集细节", "雨后观察", "detail", "landscape", 0, ["evidence"], "water-detail", ["水面", "漂浮物"]),
      visual("居民在窗边接受访谈", "居民访谈", "portrait", "portrait", 1, ["portrait", "supporting"], "resident-portrait", ["居民"]),
      visual("居民在地图上标记地点", "居民访谈", "close-up", "landscape", 2, ["evidence"], "interview-map", ["居民", "地图"]),
      visual("社区调整收集点后的现场", "方案试验", "wide", "landscape", 7, ["evidence", "supporting"], "community-pilot", ["社区", "收集点"]),
      visual("观察资料交接给社区", "资料交接", "medium", "landscape", 5, ["evidence"], "handover", ["队员", "社区工作者"]),
      visual("居民与实践队在河边合影", "共同维护", "group", "landscape", 18, ["closing-candidate", "supporting"], "practice-group", ["居民", "实践队"]),
    ],
    humanReviewFocus: ["纪录片节奏是否成立", "居民肖像是否被尊重", "成果是否由行动而非卡片呈现"],
  },
  {
    id: "event-open-day", category: "活动回顾", articleType: "event-recap",
    title: "开放日回顾：六条探索路线如何汇成一个问题",
    opening: "今年开放日不按展位数量统计热度，而以六条探索路线观察访客如何提出问题。报道从主会场分流、实验室体验和学生圆桌推进，最后用反馈墙和全景合影完成闭环。",
    context: "活动回顾通过路线切换、互动细节与参与者反馈形成多线叙事，避免流水账",
    sections: [
      { heading: "从主会场出发，而不是停在主会场", focus: "开场介绍只占二十分钟，随后访客按能源、材料、智能系统等方向进入不同路线。引导牌使用颜色和问题句区分内容，避免所有人挤在最醒目的展台。", detail: "主会场全景建立人数和空间，小图展示路线卡。视觉先总后分，帮助读者理解活动结构。" },
      { heading: "实验室里，先允许设备失败一次", focus: "在智能系统路线中，讲解学生故意展示一次识别失败，再邀请中学生调整光线和角度。体验因此不再是按按钮，而是通过变量变化理解系统边界。", detail: "设备与参与者共同出现在主图，屏幕结果作为证据补充。镜头强调互动关系，不把仪器孤立成产品广告。" },
      { heading: "一张材料样片引出的十个追问", focus: "材料展台没有罗列全部参数，而用一块可弯折样片引出制造、寿命和回收问题。讲解教师把问题写在透明板上，让后续访客继续补充。", detail: "近景样片与多人讨论形成尺度对比。图片组按同一问题关联，而不是按摄影师到场顺序排列。" },
      { heading: "学生圆桌，把选择说得更具体", focus: "下午的学生圆桌不提供标准答案。不同专业学生分别讲述一次改方向、一次失败项目和一次跨学科合作，访客据此追问课程压力与学习方式。", detail: "半圆构图保留发言人与听众，局部肖像只在关键原话处出现。节奏从高密度体验转向较慢的人物交流。", extra: "> “我最终选择的不是一个听起来最热门的专业，而是一组愿意连续几年追问的问题。”" },
      { heading: "反馈墙上，问题继续生长", focus: "离场前，访客把最想继续了解的问题贴到反馈墙。工作人员按主题整理，并将高频问题转给学院制作后续答疑，开放日由一次现场活动变成持续沟通。", detail: "反馈墙细节先出现，最终全景合影再收束六条路线。结尾回应开场的分流，也显示不同问题重新汇在一起。" },
    ],
    closing: "开放日最有价值的统计不是到场人数，而是问题如何变得更具体。六条路线在离场处重新汇合，留下的反馈将进入下一轮课程介绍与实验室开放。",
    visuals: [
      visual("开放日主会场与六条路线入口", "主会场分流", "wide", "landscape", 80, ["hero-candidate"], "open-day-hall", ["访客", "主会场"]),
      visual("访客从主会场分流", "路线出发", "wide", "landscape", 42, ["supporting"], "route-crowd", ["访客", "引导员"]),
      visual("六色探索路线卡", "路线出发", "detail", "square", 1, ["evidence"], "route-cards", ["路线卡"]),
      visual("中学生调整识别设备", "实验室体验", "medium", "landscape", 5, ["supporting"], "device-interaction", ["学生", "设备"]),
      visual("识别失败与修正界面", "实验室体验", "detail", "landscape", 1, ["evidence"], "interface-result", ["识别界面"]),
      visual("访客围绕可弯折样片讨论", "材料追问", "group", "landscape", 9, ["supporting"], "material-discussion", ["访客", "教师"]),
      visual("可弯折材料样片特写", "材料追问", "close-up", "landscape", 1, ["evidence"], "material-sample", ["材料样片"]),
      visual("学生圆桌与听众半圆", "学生圆桌", "wide", "landscape", 28, ["supporting"], "student-roundtable", ["学生", "访客"]),
      visual("写满追问的反馈墙", "反馈闭环", "detail", "landscape", 4, ["evidence"], "feedback-wall", ["反馈墙", "问题便签"]),
      visual("开放日参与者主会场合影", "路线汇合", "group", "landscape", 64, ["closing-candidate", "supporting"], "open-day-group", ["访客", "师生"]),
    ],
    humanReviewFocus: ["六条路线是否产生叙事差异", "设备互动是否图像主导", "反馈墙与开场是否呼应"],
  },
];

const distribution = [2, 2, 2, 1, 1] as const;

function enrich(spec: CaseSpec, section: SectionSpec, index: number): string {
  const cadence = ["先建立场景，再呈现动作，最后用细节证明判断", "从人物关系进入问题，再回到可以核验的现场", "让主画面承担情绪，小画面补充原因和结果", "用留白区分阶段，不以边框制造虚假的层级", "在结尾回应开场，同时把行动交给下一位参与者"][index]!;
  return `这一节继续围绕“${section.heading}”展开。编辑上坚持${cadence}；图像说明人物、地点和行为，正文补足看不见的判断过程。${spec.context}，因此每张图都有明确角色，段落也不依靠重复模板维持秩序。`;
}

function buildCase(spec: CaseSpec): RealisticEditorialAcceptanceCaseV2 {
  let visualIndex = 1;
  const hero = spec.visuals[0]!;
  const sectionMarkdown = spec.sections.map((section, sectionIndex) => {
    const count = distribution[sectionIndex]!;
    const visuals = spec.visuals.slice(visualIndex, visualIndex + count);
    visualIndex += count;
    const images = visuals.map((item) => `![${item.alt}](/editorial-v2-assets/${item.kind}.svg "${item.alt}")`).join("\n\n");
    return `## ${section.heading}\n\n${section.focus}\n\n${section.detail}\n\n${enrich(spec, section, sectionIndex)}${section.extra ? `\n\n${section.extra}` : ""}\n\n${images}`;
  }).join("\n\n");
  const closing = spec.visuals.at(-1)!;
  const markdown = `# ${spec.title}\n\n${spec.opening}\n\n![${hero.alt}](/editorial-v2-assets/${hero.kind}.svg "${hero.alt}")\n\n${sectionMarkdown}\n\n${spec.closing}\n\n![${closing.alt}](/editorial-v2-assets/${closing.kind}.svg "${closing.alt}")`;
  const article = parseArticle({ format: "markdown", content: markdown }).article;
  const imageBlocks = article.blocks.filter((block) => block.type === "image");
  if (imageBlocks.length !== spec.visuals.length) throw new Error(`${spec.id} image fixture mismatch: ${imageBlocks.length}/${spec.visuals.length}`);
  const understanding: AssetUnderstandingMap = {
    schemaVersion: "1",
    assets: article.assets.map((asset, index) => {
      const item = spec.visuals[index]!;
      const block = imageBlocks[index]!;
      return {
        assetId: asset.id,
        description: item.alt,
        subjects: item.subjects,
        scene: item.scene,
        shotType: item.shotType,
        orientation: item.orientation,
        aspectRatio: item.orientation === "portrait" ? 3 / 4 : item.orientation === "square" ? 1 : 16 / 9,
        peopleCount: item.peopleCount,
        visualQuality: item.quality ?? "high",
        semanticRoles: item.roles,
        relatedSourceBlockIds: [block.id],
      };
    }),
  };
  return {
    id: spec.id,
    category: spec.category,
    articleType: spec.articleType,
    article,
    assetUnderstanding: understanding,
    previewUrlByAssetId: Object.fromEntries(article.assets.map((asset, index) => {
      const item = spec.visuals[index]!;
      const query = new URLSearchParams({ kind: item.kind, label: item.alt, shot: item.shotType, orientation: item.orientation });
      return [asset.id, `/editorial-v2-assets/generated.svg?${query.toString()}`];
    })),
    humanReviewFocus: spec.humanReviewFocus,
  };
}

export const REALISTIC_EDITORIAL_ACCEPTANCE_SET_V2 = specs.map(buildCase);
