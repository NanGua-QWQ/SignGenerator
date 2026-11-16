/**
 * 生成「图案库」目录数据。
 *
 * 数据来源：
 *  1. 贴图文件：`public/textures/sign/*.png`（从 yunbeiuc 模组拷贝而来）
 *  2. 中文名：模组 `lang/zh_cn.json` 里的 `block.yunbeiuc.sign_*` 等条目
 *  3. 分组规则：逐条复刻模组 `screen/PatternRegistry.java` 的
 *     `addSignSections()`（前缀 / 白名单 / 排除），保证工坊里的分类与模组内
 *     「图案」标签页完全一致。
 *
 * 用法：
 *   node scripts/gen-texture-catalog.mjs [langJsonPath]
 *
 * 默认 langJsonPath 指向本机参考仓库；若不存在则只输出文件名（标签退化为文件名）。
 * 生成结果：`src/app/lib/studio/texture-catalog.ts`（提交进仓库，运行时零依赖）。
 */

import {
  readdirSync, readFileSync, writeFileSync, existsSync,
} from 'node:fs'
import {
  dirname, join, resolve,
} from 'node:path'
import {
  fileURLToPath,
} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const textureDir = join(root, 'public', 'textures', 'sign')
const outFile = join(root, 'src', 'app', 'lib', 'studio', 'texture-catalog.ts')

const defaultLang = 'D:/yunbei-urban-construction/versions/common/src/main/resources/assets/yunbeiuc/lang/zh_cn.json'
const langPath = process.argv[2] ?? defaultLang

/* ------------------------------------------------------------------ *
 * 1. 模组 PatternRegistry 的分组常量（照抄，勿随意改动）
 * ------------------------------------------------------------------ */

const BASIC_PATTERN_TEXTURES = [
  'sign_guide_lane_arrow_left_turn.png',
  'sign_guide_lane_arrow_right_turn.png',
  'sign_guide_lane_arrow_straight.png',
  'sign_guide_lane_arrow_straight_left_turn.png',
  'sign_guide_lane_arrow_straight_left_turn_around.png',
  'sign_guide_lane_arrow_straight_right_turn.png',
  'sign_expressway_arrow_left.png',
  'sign_expressway_exit_lane_arrow.png',
  'sign_expressway_right_side_median_strip.png',
  'sign_expressway_straight.png',
  'zones_board_arrow_left.png',
  'zones_board_arrow_left_right.png',
  'zones_board_arrow_left_turn.png',
  'zones_board_arrow_straight.png',
  'sign_no_left_right_turn.png',
  'sign_no_left_turn.png',
  'sign_no_right_turn.png',
  'sign_no_single_left_turn_around.png',
  'sign_no_straight.png',
  'sign_no_straight_left_turn.png',
  'sign_no_straight_right_turn.png',
  'sign_indication_left.png',
  'sign_indication_left_right_turn.png',
  'sign_indication_left_turn.png',
  'sign_indication_left_turn_around.png',
  'sign_indication_right.png',
  'sign_indication_right_turn.png',
  'sign_indication_single_left_turn_around.png',
  'sign_indication_straight.png',
  'sign_indication_straight_inverted.png',
  'sign_indication_straight_left_turn.png',
  'sign_indication_straight_right_turn.png',
]

const BACKGROUND_PATTERN_TEXTURES = [
  'sign_expressway_logo.png',
  'sign_expressway_national_logo_1.png',
  'sign_expressway_national_logo_2.png',
  'sign_expressway_provincial_logo_1.png',
  'sign_expressway_provincial_logo_2.png',
  'sign_ordinary_municipal_road_logo_1.png',
  'sign_ordinary_municipal_road_logo_2.png',
  'sign_white_number_logo.png',
  'sign_red_number_logo.png',
  'sign_yellow_number_logo.png',
  'sign_circle.png',
]

const NO_SIGN_EXTRA = [
  'sign_charging',
  'sign_check',
  'sign_port_check',
  'sign_wrong_way',
  'sign_stop',
  'sign_yield_to_oncoming_traffic',
  'sign_slow',
  'sign_yield',
]

const GUIDE_FACILITY_EXTRA = [
  'sign_guide_identification_airport',
  'sign_guide_identification_ferry_crossing',
  'sign_guide_identification_first_aid_station',
]

const GENERAL_EXCLUDED = [
  'sign_guide_distance_to_tunnel_exit_3.png',
  'sign_guide_distance_to_tunnel_exit_4.png',
  'sign_expressway_naming_number_1.png',
  'sign_expressway_naming_number_2.png',
  'sign_guide_lane_indicator_1.png',
]

const INTERSECTION_ADVANCE_WARNING_5 = 'sign_guide_intersection_advance_warning_5'
const GUIDE_DIRECTION_ROAD_NAME = 'sign_guide_direction_road_name'

const GUIDE_DIRECTION_WUHAN = [
  'sign_guide_intersection_advance_warning_1_wuhan_left.png',
  'sign_guide_intersection_advance_warning_1_wuhan_straight.png',
]

const GUIDE_DIRECTION_SUB_PREFIXES = [
  'sign_guide_direction_3pathsign',
  'sign_guide_direction_4pathsign',
  'sign_guide_direction_arrow',
  'sign_guide_direction_exits',
  'sign_guide_direction_interchange',
  'sign_guide_direction_roundabout',
]

/* ------------------------------------------------------------------ *
 * 2. 旅游区符号中文名
 *    模组 lang 里没有 sign_travel_* 条目，这里按 GB 旅游符号名称补全。
 *    键 = 去掉 `sign_travel_` 前缀、再去掉结尾 `_<数字>` 的部分。
 * ------------------------------------------------------------------ */

const TRAVEL_NAMES = {
  ancient_academy: '古书院',
  ancient_city: '古城',
  ancient_pagoda: '古塔',
  ancient_town: '古镇',
  angling: '垂钓',
  aquarium: '水族馆',
  aquatic_park: '水上乐园',
  arch_bridge: '拱桥',
  art_gallery: '美术馆',
  ballooning: '热气球运动',
  bamboo_forest: '竹林',
  barber: '理发店',
  bath: '洗浴',
  bathing_beach: '海滨浴场',
  beach: '海滩',
  bell_tower: '钟楼',
  bird_habitat: '鸟类栖息地',
  boating: '划船',
  botanical_garden: '植物园',
  buddhist_temple: '佛寺',
  cable_car: '索道',
  campfire: '篝火',
  camping: '露营',
  cave: '溶洞',
  cemetery: '陵园',
  childr: '儿童乐园',
  church: '教堂',
  cinema: '电影院',
  city_wall: '城墙',
  dam: '水坝',
  desert: '沙漠',
  diving: '潜水',
  eathing_beach: '海水浴场',
  education_base: '教育基地',
  farm: '农庄',
  ferry_dock: '渡口',
  fishing: '钓鱼',
  fjord: '峡湾',
  flower_sea: '花海',
  fountain: '喷泉',
  frozen_world: '冰雪世界',
  glacier: '冰川',
  glass_bridge: '玻璃桥',
  golf: '高尔夫',
  grassland: '草原',
  hature_peserve: '自然保护区',
  hiking: '徒步',
  historic_sites: '古迹',
  historical_relics: '文物古迹',
  holiday_village: '度假村',
  horse_trail: '马道',
  hot_air_balloon: '热气球',
  hot_spring: '温泉',
  imperial_mausoleum: '帝王陵寝',
  information: '旅游咨询',
  island: '海岛',
  island_resort: '海岛度假',
  lake: '湖泊',
  library: '图书馆',
  logging_camp: '伐木场',
  ma_tau_wall: '妈头墙',
  marsh: '沼泽',
  meteorite_crater: '陨石坑',
  mine_park: '矿山公园',
  modern_tourist_farm: '现代观光农场',
  monument: '纪念碑',
  mosque: '清真寺',
  mountain: '山岳',
  museum: '博物馆',
  music: '音乐',
  nature_reserve: '自然保护区',
  ocean_park: '海洋公园',
  old_bridge: '古桥',
  old_street: '老街',
  orchard: '果园',
  panorama: '全景',
  park: '公园',
  picnic_area: '野餐区',
  playground: '游乐场',
  pleasure_ground: '游乐园',
  raft_village: '筏村',
  rafting: '漂流',
  recreation_area: '休闲区',
  rest_area: '服务区',
  river: '河流',
  sand_dunes: '沙丘',
  scenic_area: '风景区',
  scenic_drive: '风景道',
  scenic_spot: '景点',
  skating: '滑冰',
  ski_resort: '滑雪场',
  skiing: '滑雪',
  snow_mountain: '雪山',
  studio_town: '影视城',
  swimming: '游泳',
  taoist_church: '道观',
  tea_garden: '茶园',
  temple: '寺庙',
  the_great_wall: '长城',
  theatre: '剧院',
  tourist_area: '旅游区',
  valley: '峡谷',
  view_point_telescope: '观景望远镜',
  viewing: '观景',
  viewing_platform: '观景台',
  water_conservancy_project: '水利工程',
  waterfall: '瀑布',
  wine_chateau: '酒庄',
  winter_tourism_area: '冬季旅游区',
  woodland: '森林',
  zoo: '动物园',
}

/* ------------------------------------------------------------------ *
 * 2b. 补充中文名
 *     这些贴图是「图案素材」而非方块，模组 lang 里没有对应条目，
 *     按 GB 5768 的名称补全。键 = 去掉结尾 `_<数字>` 的文件名。
 * ------------------------------------------------------------------ */

const DIR_CN = { left: '左', right: '右', top: '上', normal: '常规', straight: '直行' }

const EXTRA_NAMES = {
  /* —— 高速 / 编号底图 —— */
  sign_expressway_arrow_left: '高速导向箭头（左）',
  sign_expressway_east: '高速方向（东）',
  sign_expressway_north: '高速方向（北）',
  sign_expressway_south: '高速方向（南）',
  sign_expressway_west: '高速方向（西）',
  sign_expressway_geographical_direction_east: '地理方向（东）',
  sign_expressway_geographical_direction_north: '地理方向（北）',
  sign_expressway_geographical_direction_south: '地理方向（南）',
  sign_expressway_geographical_direction_west: '地理方向（西）',
  sign_expressway_entrance_advance_text: '高速入口预告文字',
  sign_expressway_exit_background: '高速出口底图',
  sign_expressway_exit_lane_arrow: '高速出口车道箭头',
  sign_expressway_exit_text: '高速出口文字',
  sign_expressway_logo: '高速公路编号底图',
  sign_expressway_naming_number: '高速命名编号',
  sign_expressway_national_logo: '国家高速编号底图',
  sign_expressway_provincial_logo: '省级高速编号底图',
  sign_expressway_right_side_median_strip: '右侧分隔带',
  sign_expressway_straight: '高速直行箭头',
  sign_expressway_number: '高速编号',
  sign_ordinary_municipal_road_logo: '普通公路编号底图',
  sign_white_number_logo: '白色编号底图',
  sign_red_number_logo: '红色编号底图',
  sign_yellow_number_logo: '黄色编号底图',
  sign_circle: '禁令圆形底板',

  /* —— 指路 · 一般道路 —— */
  sign_guide_east: '方向（东）',
  sign_guide_north: '方向（北）',
  sign_guide_south: '方向（南）',
  sign_guide_west: '方向（西）',
  sign_guide_identification_airport: '机场',
  sign_guide_lane_arrow_left_turn: '车道箭头：左转',
  sign_guide_lane_arrow_right_turn: '车道箭头：右转',
  sign_guide_lane_arrow_straight: '车道箭头：直行',
  sign_guide_lane_arrow_straight_left_turn: '车道箭头：直行和左转',
  sign_guide_lane_arrow_straight_left_turn_around: '车道箭头：直行和掉头',
  sign_guide_lane_arrow_straight_right_turn: '车道箭头：直行和右转',
  sign_guide_roadside_facility_parking: '路边设施：停车场',
  sign_guide_roadside_facility_parking_spot: '路边设施：停车位',
  sign_guide_roadside_facility_service_station: '路边设施：服务区',

  /* —— 指路 · 设施标识 —— */
  sign_guide_facility_camera: '监控摄像',
  sign_guide_facility_car_wash: '洗车',
  sign_guide_facility_charging_pile: '充电桩',
  sign_guide_facility_climbing_lane: '爬坡车道',
  sign_guide_facility_coffee: '咖啡',
  sign_guide_facility_covered_parkinglot: '室内停车场',
  sign_guide_facility_emergency_call: '紧急电话',
  sign_guide_facility_emergency_shelter: '紧急避险处',
  sign_guide_facility_etc: 'ETC 不停车收费',
  sign_guide_facility_exit_100m: '出口预告 100 米',
  sign_guide_facility_exit_200m: '出口预告 200 米',
  sign_guide_facility_exit_300m: '出口预告 300 米',
  sign_guide_facility_fast_food: '快餐',
  sign_guide_facility_hotel: '住宿',
  sign_guide_facility_interchange: '互通式立交',
  sign_guide_facility_lane_increase: '车道增加',
  sign_guide_facility_parking_lot: '停车场',
  sign_guide_facility_pedestrian_bridge: '人行天桥',
  sign_guide_facility_pedestrian_underpass: '人行地下通道',
  sign_guide_facility_repair: '车辆修理',
  sign_guide_facility_restaurant: '餐饮',
  sign_guide_facility_road_exit: '道路出口',
  sign_guide_facility_road_origin: '道路起点',
  sign_guide_facility_road_terminus: '道路终点',
  sign_guide_facility_supermarket: '超市',
  sign_guide_facility_toilet: '公共厕所',
  sign_guide_facility_tollgate: '收费站',
  sign_guide_facility_traffic_radio: '交通广播',
  sign_guide_facility_tunnel_entrance: '隧道入口',
  sign_guide_facility_tunnel_exit: '隧道出口',

  /* —— 指示标识 —— */
  sign_indication_drive_right: '靠右侧道路行驶',
  sign_indication_hov: '多乘员车辆专用车道',
  sign_indication_large_bus: '大型客车专用车道',
  sign_indication_large_bus_brt: '快速公交专用车道',
  sign_indication_large_bus_text: '大型客车专用车道（文字）',
  sign_indication_left: '向左行驶',
  sign_indication_left_turn_around: '掉头',
  sign_indication_one_way_street: '单行路',
  sign_indication_parking_non_motor_vehicles: '非机动车停车位',
  sign_indication_right: '向右行驶',
  sign_indication_single_left_turn_around: '掉头（单图）',
  sign_indication_small_passenger_car: '小型客车专用车道',
  sign_indication_straight_inverted: '直行（倒置）',
  sign_indication_tram: '有轨电车专用车道',

  /* —— 告示标识 —— */
  sign_notice_arrow_green: '告示箭头（绿）',
  sign_notice_arrow_red: '告示箭头（红）',
  sign_notice_arrow_white: '告示箭头（白）',
  sign_notice_arrow_yellow: '告示箭头（黄）',
  sign_notice_borrow_lane_left_turn: '借道左转',
  sign_notice_chevron_lines: '线形诱导标（斜线）',
  sign_notice_detour_arrow: '绕行箭头',
  sign_notice_drop_off_platform_pedestrian_hint: '落客平台行人提示',
  sign_notice_elevated_road: '高架道路',
  sign_notice_exit_lane: '出口车道',
  sign_notice_fasten_seat_belt: '请系好安全带',
  sign_notice_fatigue_driving: '防止疲劳驾驶',
  sign_notice_lane_control: '车道控制',
  sign_notice_mesh_line: '网状线',
  sign_notice_multi_vehicle_tandem_u_turn: '多车串联掉头',
  sign_notice_no_drunk_driving: '禁止酒后驾车',
  sign_notice_no_entry: '禁止驶入',
  sign_notice_no_handheld_phone_while_driving: '禁止驾车时手持电话',
  sign_notice_no_littering: '禁止乱扔垃圾',
  sign_notice_non_motor_cross: '非机动车推行过街',
  sign_notice_non_motor_left_turn_two_step_crossing: '非机动车左转二次过街',
  sign_notice_ramp_sharp_turn: '匝道急弯',
  sign_notice_right_turn_danger: '右转危险',
  sign_notice_same_direction_separate: '同向分离',
  sign_notice_special_weather: '特殊天气',
  sign_notice_stop_for_ticket: '停车取卡',
  sign_notice_waiting_area: '停车等待区',
  sign_notice_way_closed: '道路封闭',
  sign_notice_weaving_section: '交织区',
  sign_notice_x_mark_red: '红色叉形标记',
  sign_notice_yield_bus: '让行公交',
  sign_notice_zipper_merge: '拉链式交替通行',

  /* —— 警告标识补充 —— */
  sign_warning_emergency_lane: '紧急车道',

  /* —— 单图底板 / 区域信息板 —— */
  sign_single: '单图底板',
  sign_single_blue: '单图底板（蓝）',
  sign_single_gray: '单图底板（灰）',
  sign_single_green: '单图底板（绿）',
  sign_single_notice: '单图底板（告示）',
  sign_single_orange: '单图底板（橙）',
  sign_single_purple: '单图底板（紫）',
  sign_single_red: '单图底板（红）',
  sign_single_travel: '单图底板（旅游）',
  sign_single_white: '单图底板（白）',
  sign_single_yellow: '单图底板（黄）',
  sign_single_yellow_wuxi: '单图底板（黄·无锡）',
  zones_board_fluorescence: '区域信息板（荧光）',
  zones_board_length: '区域信息板（长度）',
  zones_board_simple: '区域信息板（简版）',
  zones_board_warning: '区域信息板（警告）',

  /* —— 辅助及其他 —— */
  sign_bus: '公交',
  sign_charging: '充电',
  sign_disabled: '残疾人',
  sign_fluorescence: '荧光色块',
  sign_gray: '灰色色块',
  sign_lane: '车道',
  sign_lane_four: '四车道',
  sign_red: '红色色块',
  sign_school_bus: '校车',
  sign_slow: '慢行',
  sign_taxi: '出租车',
  sign_toilet: '厕所',
  sign_unit_metre: '米（单位）',
  sign_water: '水',
  sign_wrong_way: '逆向行驶',
}

/**
 * 参数化文件名 → 中文名的规则（补充字典覆盖不到的批量族）。
 * 命中顺序即优先级。
 */
const EXTRA_RULES = [
  [/^sign_guide_direction_(\d)pathsign(\d+)_(\w+)$/, m => `${m[1] === '3' ? '三' : '四'}岔路口预告 ${m[2]}（${DIR_CN[m[3]] ?? m[3]}）`],
  [/^sign_guide_direction_arrow(\d+)$/, m => `导向箭头 ${m[1]}`],
  [/^sign_guide_direction_exits(\d+)$/, m => `出口预告 ${m[1]}`],
  [/^sign_guide_direction_interchange(\d)_(\d)dir(\d+)$/, m => `立交预告 ${m[1]}-${m[2]}-${m[3]}`],
  [/^sign_guide_direction_roundabout_3path1_(\w+)$/, m => `环岛预告 三岔（${DIR_CN[m[1]] ?? m[1]}）`],
  [/^sign_guide_direction_roundabout_4path1_normal$/, () => '环岛预告 四岔'],
  [/^sign_guide_direction_roundabout_basic$/, () => '环岛预告 基本'],
  [/^sign_guide_intersection_warning_5_(\w+)$/, m => `路口警告 5（${DIR_CN[m[1]] ?? m[1]}）`],
]

/* ------------------------------------------------------------------ *
 * 3. 分区定义（顺序 = 模组图案标签页里的顺序）
 * ------------------------------------------------------------------ */

const SECTIONS = [
  {
    key: 'basic',
    title: '基本图案',
    hint: '常用的箭头素材：导向箭头、车道箭头，以及禁令/指示标志里的转向箭头。',
    match: (f, base) => BASIC_PATTERN_TEXTURES.includes(f),
  },
  {
    key: 'background',
    title: '底图图案',
    hint: '需要拼接的底图：高速/普通公路编号背景、禁令圆形底板，方便与其他图案搭配。',
    match: (f, base) => BACKGROUND_PATTERN_TEXTURES.includes(f),
  },
  {
    key: 'prohibition',
    title: '禁令标识',
    hint: '表示禁止、限制及相应解除的含义，含限速、限重、限高、限宽。',
    match: (f, base) => {
      if (base.startsWith('sign_notice')) return false
      if (BASIC_PATTERN_TEXTURES.some(n => n.startsWith('sign_no_') && n === f)) return false
      if (['sign_no', 'sign_speed', 'sign_min', 'sign_weight', 'sign_height', 'sign_alex'].some(p => base.startsWith(p))) return true
      return NO_SIGN_EXTRA.some(p => base.startsWith(p))
    },
  },
  {
    key: 'indication',
    title: '指示标识',
    hint: '表示指示车辆、行人行进的含义。',
    match: (f, base) => base.startsWith('sign_indication')
      && !BASIC_PATTERN_TEXTURES.some(n => n.startsWith('sign_indication_') && n === f),
  },
  {
    key: 'warning',
    title: '警告标识',
    hint: '警告车辆驾驶人注意前方难以发现的情况，需减速慢行或采取其他安全行动。',
    match: (f, base) => base.startsWith('sign_warning'),
  },
  {
    key: 'guide-general',
    title: '指路 · 一般道路',
    hint: '一般道路指路标志，以蓝色为底色、白色为文字图案色。',
    match: (f, base) => {
      if (!base.startsWith('sign_guide')) return false
      if (['sign_guide_roadside_facility', 'sign_guide_facility', 'sign_guide_impassable_road', INTERSECTION_ADVANCE_WARNING_5].some(p => base.startsWith(p))) return false
      if (GUIDE_DIRECTION_SUB_PREFIXES.some(p => base.startsWith(p))) return false
      if (GUIDE_FACILITY_EXTRA.some(p => base.startsWith(p))) return false
      if (BASIC_PATTERN_TEXTURES.some(n => n.startsWith('sign_guide_lane_arrow') && n === f)) return false
      if (GENERAL_EXCLUDED.includes(f)) return false
      return true
    },
  },
  {
    key: 'guide-direction',
    title: '指路 · 交叉路口预告',
    hint: '告知前方交叉路口形式、交叉道路编号或名称、通往方向与通行方向。',
    match: (f, base) => {
      if (base.startsWith(GUIDE_DIRECTION_ROAD_NAME)) return false
      if (GUIDE_DIRECTION_WUHAN.includes(f)) return false
      return base.startsWith('sign_guide_direction')
        || base.startsWith('sign_guide_intersection_advance_warning')
    },
  },
  {
    key: 'guide-expressway',
    title: '指路 · 城市快速路和高速公路',
    hint: '城市快速路和高速公路指路标志，以绿色为底色、白色为文字图案色。',
    match: (f, base) => base.startsWith('sign_expressway')
      && !BASIC_PATTERN_TEXTURES.some(n => n.startsWith('sign_expressway_') && n === f)
      && !BACKGROUND_PATTERN_TEXTURES.some(n => n.startsWith('sign_expressway_') && n === f),
  },
  {
    key: 'guide-facility',
    title: '指路 · 设施标识',
    hint: '为道路使用者提供各种重要场所的识别和指向。',
    match: (f, base) => ['sign_guide_facility', 'sign_guide_impassable_road'].some(p => base.startsWith(p))
      || GUIDE_FACILITY_EXTRA.some(p => base.startsWith(p)),
  },
  {
    key: 'tourist',
    title: '旅游区标识',
    hint: '指导人们前往邻近旅游区，识别方向与距离，了解旅游项目类别。',
    match: (f, base) => base.startsWith('sign_travel'),
  },
  {
    key: 'notice',
    title: '告示标识',
    hint: '提醒驾驶人在行驶过程中需要注意的情况或需要避免的驾驶行为。',
    match: (f, base) => base.startsWith('sign_notice'),
  },
  {
    key: 'others',
    title: '辅助标识及其他',
    hint: '未归入以上分类的素材：单图标志底板、区域信息板、辅助色块等。',
    match: () => true,
  },
]

/* ------------------------------------------------------------------ *
 * 4. 读数据 → 分组 → 生成
 * ------------------------------------------------------------------ */

const files = readdirSync(textureDir).filter(f => f.endsWith('.png')).sort()

let nameMap = {}
if (existsSync(langPath)) {
  const raw = JSON.parse(readFileSync(langPath, 'utf8'))
  for (const [k, v] of Object.entries(raw)) {
    const m = /^block\.yunbeiuc\.((?:sign_|zones_board)[A-Za-z0-9_]*)$/.exec(k)
    if (m) nameMap[m[1]] = v
  }
}
else {
  console.warn(`[warn] 找不到语言文件：${langPath}\n       中文名将退化为文件名。`)
}

/** 文件名（含扩展名）→ { 中文标签, 是否命中词典 } */
function resolveLabel(file) {
  const base = file.replace(/\.png$/, '')
  // 1. 模组 lang 精确条目
  if (nameMap[base]) return { label: nameMap[base], named: true }
  // 2. 旅游区符号
  if (base.startsWith('sign_travel_')) {
    const key = base.slice('sign_travel_'.length).replace(/_\d+$/, '')
    if (TRAVEL_NAMES[key]) return { label: TRAVEL_NAMES[key], named: true }
  }
  // 3. 补充字典（去掉结尾 `_<数字>` 再查）
  const stripped = base.replace(/_\d+$/, '')
  if (EXTRA_NAMES[stripped]) return { label: EXTRA_NAMES[stripped], named: true }
  if (EXTRA_NAMES[base]) return { label: EXTRA_NAMES[base], named: true }
  // 4. 参数化规则
  for (const [re, fn] of EXTRA_RULES) {
    const m = re.exec(base)
    if (m) return { label: fn(m), named: true }
  }
  // 5. 兜底：把文件名整理成可读形式
  return {
    label: base.replace(/^(sign|zones_board)_/, '').replace(/_/g, ' '),
    named: false,
  }
}

const labelOf = file => resolveLabel(file).label

const groups = SECTIONS.map(section => ({
  ...section,
  files: files.filter(f => section.match(f, f.replace(/\.png$/, ''))),
}))

// 每个文件只归属第一个命中的分区（与模组的「排除优先」语义等价）
const seen = new Set()
for (const g of groups) {
  g.files = g.files.filter((f) => {
    if (seen.has(f)) return false
    seen.add(f)
    return true
  })
}

const unassigned = files.filter(f => !seen.has(f))
if (unassigned.length) console.warn(`[warn] ${unassigned.length} 个贴图未归类：`, unassigned.slice(0, 10))
// 兜底标签（未命中任何词典）说明还没补中文名
const missingName = files.filter(f => !resolveLabel(f).named)
if (missingName.length) console.warn(`[warn] ${missingName.length} 个贴图没有中文名：`, missingName.slice(0, 10))

const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`

const body = groups
  .filter(g => g.files.length > 0)
  .map(g => `  {
    key: ${q(g.key)},
    title: ${q(g.title)},
    hint: ${q(g.hint)},
    items: [
${g.files.map(f => `      { file: ${q(f)}, label: ${q(labelOf(f))} },`).join('\n')}
    ],
  },`)
  .join('\n')

const out = `/**
 * 图案库目录（自动生成，请勿手改）。
 *
 * 由 \`scripts/gen-texture-catalog.mjs\` 生成：
 *  - 贴图清单来自 \`public/textures/sign/\`
 *  - 中文名来自 yunbeiuc 模组 \`lang/zh_cn.json\`
 *  - 分组规则复刻模组 \`screen/PatternRegistry.java\`
 *
 * 共 ${files.length} 张贴图，${groups.filter(g => g.files.length).length} 个分组。
 */

export interface TextureEntry {
  /** 文件名，如 \`sign_stop.png\` */
  file: string
  /** 中文显示名 */
  label: string
}

export interface TextureGroup {
  key: string
  title: string
  hint: string
  items: TextureEntry[]
}

/** 内置贴图所在的静态目录（相对站点根） */
export const TEXTURE_PUBLIC_DIR = '/textures/sign'

/** 内置贴图总数 */
export const TEXTURE_TOTAL = ${files.length}

export const TEXTURE_GROUPS: readonly TextureGroup[] = [
${body}
]
`

writeFileSync(outFile, out, 'utf8')
console.log(`✓ 生成 ${outFile}`)
console.log(`  ${files.length} 张贴图 / ${groups.filter(g => g.files.length).length} 个分组`)
for (const g of groups) console.log(`    ${g.title.padEnd(18)} ${g.files.length}`)
