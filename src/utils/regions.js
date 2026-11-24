

// 统一的国家/地区代码映射 (基于ISO 3166-1 alpha-2标准)
const REGION_NAMES = {
	// 亚洲 - Asia
	'HK': 'HK香港', 'TW': 'TW台湾', 'JP': 'JP日本', 'KR': 'KR韩国', 'SG': 'SG新加坡',
	'MY': 'MY马来西亚', 'TH': 'TH泰国', 'VN': 'VN越南', 'ID': 'ID印尼', 'PH': 'PH菲律宾',
	'IN': 'IN印度', 'PK': 'PK巴基斯坦', 'BD': 'BD孟加拉', 'KH': 'KH柬埔寨', 'MM': 'MM缅甸',
	'LK': 'LK斯里兰卡', 'NP': 'NP尼泊尔', 'KZ': 'KZ哈萨克斯坦', 'UZ': 'UZ乌兹别克斯坦',
	'LA': 'LA老挝', 'BN': 'BN文莱', 'MN': 'MN蒙古', 'BT': 'BT不丹', 'MV': 'MV马尔代夫',
	'TJ': 'TJ塔吉克斯坦', 'KG': 'KG吉尔吉斯斯坦', 'TM': 'TM土库曼斯坦',

	// 美洲 - Americas
	'US': 'US美国', 'CA': 'CA加拿大', 'MX': 'MX墨西哥', 'BR': 'BR巴西', 'AR': 'AR阿根廷',
	'CL': 'CL智利', 'CO': 'CO哥伦比亚', 'PE': 'PE秘鲁', 'VE': 'VE委内瑞拉', 'EC': 'EC厄瓜多尔',
	'BO': 'BO玻利维亚', 'PY': 'PY巴拉圭', 'UY': 'UY乌拉圭', 'CR': 'CR哥斯达黎加', 'PA': 'PA巴拿马',
	'CW': 'CW库拉索', 'AW': 'AW阿鲁巴', 'BZ': 'BZ伯利兹', 'GT': 'GT危地马拉', 'HN': 'HN洪都拉斯',
	'NI': 'NI尼加拉瓜', 'SV': 'SV萨尔瓦多', 'DO': 'DO多米尼加', 'CU': 'CU古巴', 'JM': 'JM牙买加',
	'HT': 'HT海地', 'TT': 'TT特立尼达', 'BS': 'BS巴哈马', 'BB': 'BB巴巴多斯', 'GY': 'GY圭亚那',
	'SR': 'SR苏里南', 'FK': 'FK福克兰群岛',

	// 欧洲 - Europe
	// 西欧
	'UK': 'UK英国', 'GB': 'GB英国', 'FR': 'FR法国', 'DE': 'DE德国', 'NL': 'NL荷兰',
	'BE': 'BE比利时', 'LU': 'LU卢森堡', 'IE': 'IE爱尔兰', 'AT': 'AT奥地利', 'CH': 'CH瑞士',
	'LI': 'LI列支敦士登',
	// 南欧
	'IT': 'IT意大利', 'ES': 'ES西班牙', 'PT': 'PT葡萄牙', 'GR': 'GR希腊', 'MT': 'MT马耳他',
	'CY': 'CY塞浦路斯', 'AD': 'AD安道尔', 'SM': 'SM圣马力诺', 'VA': 'VA梵蒂冈', 'MC': 'MC摩纳哥',
	// 北欧
	'SE': 'SE瑞典', 'NO': 'NO挪威', 'DK': 'DK丹麦', 'FI': 'FI芬兰', 'IS': 'IS冰岛',
	'EE': 'EE爱沙尼亚', 'LV': 'LV拉脱维亚', 'LT': 'LT立陶宛',
	// 东欧
	'RU': 'RU俄罗斯', 'UA': 'UA乌克兰', 'PL': 'PL波兰', 'CZ': 'CZ捷克', 'SK': 'SK斯洛伐克',
	'HU': 'HU匈牙利', 'RO': 'RO罗马尼亚', 'BG': 'BG保加利亚', 'BY': 'BY白俄罗斯', 'MD': 'MD摩尔多瓦',
	// 巴尔干
	'RS': 'RS塞尔维亚', 'HR': 'HR克罗地亚', 'SI': 'SI斯洛文尼亚', 'BA': 'BA波黑', 'ME': 'ME黑山',
	'MK': 'MK北马其顿', 'AL': 'AL阿尔巴尼亚', 'XK': 'XK科索沃',
	// 高加索
	'GE': 'GE格鲁吉亚', 'AM': 'AM亚美尼亚', 'AZ': 'AZ阿塞拜疆',

	// 中东 - Middle East
	'TR': 'TR土耳其', 'AE': 'AE阿联酋', 'IL': 'IL以色列', 'SA': 'SA沙特', 'QA': 'QA卡塔尔',
	'KW': 'KW科威特', 'BH': 'BH巴林', 'OM': 'OM阿曼', 'JO': 'JO约旦', 'LB': 'LB黎巴嫩',
	'SY': 'SY叙利亚', 'IQ': 'IQ伊拉克', 'IR': 'IR伊朗', 'YE': 'YE也门', 'PS': 'PS巴勒斯坦',
	'AF': 'AF阿富汗',

	// 非洲 - Africa
	'ZA': 'ZA南非', 'EG': 'EG埃及', 'NG': 'NG尼日利亚', 'KE': 'KE肯尼亚', 'ET': 'ET埃塞俄比亚',
	'GH': 'GH加纳', 'DZ': 'DZ阿尔及利亚', 'MA': 'MA摩洛哥', 'TN': 'TN突尼斯', 'LY': 'LY利比亚',
	'SD': 'SD苏丹', 'UG': 'UG乌干达', 'ZW': 'ZW津巴布韦', 'TZ': 'TZ坦桑尼亚', 'AO': 'AO安哥拉',
	'MZ': 'MZ莫桑比克', 'NA': 'NA纳米比亚', 'BW': 'BW博茨瓦纳', 'MU': 'MU毛里求斯', 'SC': 'SC塞舌尔',
	'CI': 'CI科特迪瓦', 'CM': 'CM喀麦隆', 'SN': 'SN塞内加尔', 'ZM': 'ZM赞比亚', 'RW': 'RW卢旺达',
	'SO': 'SO索马里', 'CD': 'CD刚果金', 'CG': 'CG刚果布', 'GA': 'GA加蓬', 'BJ': 'BJ贝宁',
	'BF': 'BF布基纳法索', 'ML': 'ML马里', 'NE': 'NE尼日尔', 'TD': 'TD乍得', 'ER': 'ER厄立特里亚',
	'DJ': 'DJ吉布提', 'MG': 'MG马达加斯加', 'MW': 'MW马拉维', 'LS': 'LS莱索托', 'SZ': 'SZ斯威士兰',
	'RE': 'RE留尼汪',

	// 大洋洲 - Oceania
	'AU': 'AU澳洲', 'NZ': 'NZ新西兰', 'FJ': 'FJ斐济', 'PG': 'PG巴新', 'NC': 'NC新喀里多尼亚',
	'PF': 'PF法属波利尼西亚', 'GU': 'GU关岛', 'WS': 'WS萨摩亚', 'VU': 'VU瓦努阿图', 'TO': 'TO汤加',
	'SB': 'SB所罗门群岛', 'KI': 'KI基里巴斯', 'FM': 'FM密克罗尼西亚', 'PW': 'PW帕劳',

	// 中国特别行政区 (已包含在亚洲部分)
	'CN': 'CN中国', 'MO': 'MO澳门',

	// 其他
	'Unknown': 'Unknown未知'
};

// 统一的节点排序函数
function sortProxiesByRegion(proxies) {
	proxies.sort((a, b) => {
		// 提取节点名称前两位国家代码（大小写不敏感）
		// 只识别符合命名规范的节点：国家代码+中文/数字/特殊字符（非纯英文）
		const extractCountryCode = (name) => {
			// 匹配：两个字母开头 + 非英文字母（中文/数字/符号等）
			const match = name.match(/^([A-Z]{2})(?![a-z])/i);
			return match ? match[1].toUpperCase() : null;
		};

		const countryA = extractCountryCode(a.name);
		const countryB = extractCountryCode(b.name);

		// 如果有一个没有国家代码，没有国家代码的排在最后
		if (countryA && !countryB) {
			return -1; // A有国家代码，排在前面
		}
		if (!countryA && countryB) {
			return 1; // B有国家代码，排在前面
		}

		// 如果两个都没有国家代码，按完整名称字母排序
		if (!countryA && !countryB) {
			return a.name.localeCompare(b.name);
		}

		// 以下是两个都有国家代码的情况
		// 定义高优先级国家顺序
		const priorityCountries = ['US', 'JP', 'SG', 'TW', 'KR', 'HK', 'UK', 'DE', 'FR', 'AU'];

		// 获取优先级索引（-1表示不在优先级列表中）
		const priorityA = priorityCountries.indexOf(countryA);
		const priorityB = priorityCountries.indexOf(countryB);

		// 情况1: 两个都是高优先级国家
		if (priorityA !== -1 && priorityB !== -1) {
			if (priorityA !== priorityB) {
				return priorityA - priorityB; // 按优先级顺序排序
			}
			// 优先级相同，按节点名称字母排序
			return a.name.localeCompare(b.name);
		}

		// 情况2: 只有A是高优先级国家
		if (priorityA !== -1 && priorityB === -1) {
			return -1; // A排在前面
		}

		// 情况3: 只有B是高优先级国家
		if (priorityA === -1 && priorityB !== -1) {
			return 1; // B排在前面
		}

		// 情况4: 两个都不是高优先级国家，按国家代码字母排序
		if (countryA !== countryB) {
			return countryA.localeCompare(countryB);
		}
		// 国家代码相同，按完整名称排序
		return a.name.localeCompare(b.name);
	});
}

// 检测地区
async function detectRegion(serverAddress) {
	try {
		// 清理地址：移除IPv6地址可能的方括号
		const cleanAddress = serverAddress.replace(/^\[|\]$/g, '');

		// 调用IP-API获取地理位置信息
		const apiUrl = `http://ip-api.com/json/${encodeURIComponent(cleanAddress)}?fields=status,country,countryCode`;
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// 检查API响应状态
		if (data.status === 'success' && data.countryCode) {
			return data.countryCode;
		}

		// 如果API失败，回退到原来的关键词识别方式
		return detectRegionByKeywords(serverAddress);

	} catch (error) {
		// 网络错误或其他异常时，回退到关键词识别
		console.warn('IP-API failed, falling back to keyword detection:', error.message);
		return detectRegionByKeywords(serverAddress);
	}
}

// 关键词地区检测（作为备用方案）
function detectRegionByKeywords(serverAddress) {
	const regionKeywords = {
		'HK': ['hk', 'hong', 'kong', '香港', '港', 'hongkong'],
		'TW': ['tw', 'taiwan', 'tai', '台湾', '台', 'taipei'],
		'JP': ['jp', 'japan', 'tokyo', '日本', '东京', '大阪', 'osaka', 'kyoto'],
		'KR': ['kr', 'korea', 'seoul', '韩国', '首尔', '釜山'],
		'SG': ['sg', 'singapore', 'singapo', '新加坡', '狮城'],
		'US': ['us', 'usa', 'america', 'united', 'states', '美国', 'los', 'angeles', 'new', 'york', 'chicago', 'seattle'],
		'UK': ['uk', 'britain', 'england', 'london', '英国', '伦敦'],
		'DE': ['de', 'germany', 'german', 'berlin', '德国', '柏林'],
		'FR': ['fr', 'france', 'french', 'paris', '法国', '巴黎'],
		'AU': ['au', 'australia', 'sydney', '澳洲', '澳大利亚', '悉尼'],
		'CA': ['ca', 'canada', 'toronto', '加拿大', '多伦多'],
		'RU': ['ru', 'russia', 'moscow', '俄罗斯', '莫斯科'],
		'IN': ['in', 'india', 'mumbai', '印度', '孟买'],
		'BR': ['br', 'brazil', 'sao', 'paulo', '巴西', '圣保罗'],
		'NL': ['nl', 'netherlands', 'amsterdam', '荷兰', '阿姆斯特丹'],
		'IT': ['it', 'italy', 'rome', '意大利', '罗马'],
		'ES': ['es', 'spain', 'madrid', '西班牙', '马德里'],
		'CH': ['ch', 'switzerland', 'zurich', '瑞士', '苏黎世'],
		'MY': ['my', 'malaysia', 'kuala', 'lumpur', '马来西亚', '吉隆坡'],
		'TH': ['th', 'thailand', 'bangkok', '泰国', '曼谷'],
		'VN': ['vn', 'vietnam', 'hanoi', '越南', '河内'],
		'ID': ['id', 'indonesia', 'jakarta', '印尼', '雅加达'],
		'PH': ['ph', 'philippines', 'manila', '菲律宾', '马尼拉'],
		'TR': ['tr', 'turkey', 'istanbul', '土耳其', '伊斯坦布尔'],
		'AE': ['ae', 'uae', 'dubai', '阿联酋', '迪拜'],
		'IL': ['il', 'israel', 'tel', 'aviv', '以色列', '特拉维夫'],
		'ZA': ['za', 'south', 'africa', 'cape', 'town', '南非', '开普敦'],
		'EG': ['eg', 'egypt', 'cairo', '埃及', '开罗'],
		'AR': ['ar', 'argentina', 'buenos', 'aires', '阿根廷', '布宜诺斯艾利斯'],
		'CL': ['cl', 'chile', 'santiago', '智利', '圣地亚哥'],
		'MX': ['mx', 'mexico', 'mexico', 'city', '墨西哥', '墨西哥城'],
		'CO': ['co', 'colombia', 'bogota', '哥伦比亚', '波哥大'],
		'PE': ['pe', 'peru', 'lima', '秘鲁', '利马'],
		'UA': ['ua', 'ukraine', 'kiev', '乌克兰', '基辅'],
		'PL': ['pl', 'poland', 'warsaw', '波兰', '华沙'],
		'CZ': ['cz', 'czech', 'prague', '捷克', '布拉格'],
		'AT': ['at', 'austria', 'vienna', '奥地利', '维也纳'],
		'BE': ['be', 'belgium', 'brussels', '比利时', '布鲁塞尔'],
		'SE': ['se', 'sweden', 'stockholm', '瑞典', '斯德哥尔摩'],
		'NO': ['no', 'norway', 'oslo', '挪威', '奥斯陆'],
		'DK': ['dk', 'denmark', 'copenhagen', '丹麦', '哥本哈根'],
		'FI': ['fi', 'finland', 'helsinki', '芬兰', '赫尔辛基']
	};

	const lowerAddress = serverAddress.toLowerCase();

	for (const [region, keywords] of Object.entries(regionKeywords)) {
		for (const keyword of keywords) {
			if (lowerAddress.includes(keyword.toLowerCase())) {
				return region;
			}
		}
	}

	const domainMatch = serverAddress.match(/\.([a-z]{2})$/i);
	if (domainMatch) {
		const countryCode = domainMatch[1].toUpperCase();
		if (regionKeywords[countryCode]) {
			return countryCode;
		}
	}

	return 'Unknown';
}

export { REGION_NAMES, detectRegion, sortProxiesByRegion };
