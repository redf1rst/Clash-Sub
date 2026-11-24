

function decodeBase64Text(value) {
	const compact = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(compact + '='.repeat((4 - compact.length % 4) % 4));
	const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return binary;
	}
}

// 处理SMUX配置的通用函数
function parseSmuxConfig(params, prefix = 'smux') {
	if (params.get(`${prefix}-enabled`) === 'true') {
		const smux = {
			enabled: true,
			protocol: params.get(`${prefix}-protocol`) || 'smux'
		};

		if (params.get(`${prefix}-max-connections`)) {
			smux['max-connections'] = parseInt(params.get(`${prefix}-max-connections`));
		}
		if (params.get(`${prefix}-min-streams`)) {
			smux['min-streams'] = parseInt(params.get(`${prefix}-min-streams`));
		}
		if (params.get(`${prefix}-max-streams`)) {
			smux['max-streams'] = parseInt(params.get(`${prefix}-max-streams`));
		}
		if (params.get(`${prefix}-padding`)) {
			smux.padding = params.get(`${prefix}-padding`) === 'true';
		}
		if (params.get(`${prefix}-statistic`)) {
			smux.statistic = params.get(`${prefix}-statistic`) === 'true';
		}
		if (params.get(`${prefix}-only-tcp`)) {
			smux['only-tcp'] = params.get(`${prefix}-only-tcp`) === 'true';
		}

		return smux;
	}
	return null;
}

// 处理Brutal配置的通用函数
function parseBrutalConfig(params, prefix = 'brutal') {
	if (params.get(`${prefix}-enabled`) === 'true') {
		const brutal = {
			enabled: true
		};

		if (params.get(`${prefix}-up`)) {
			brutal.up = params.get(`${prefix}-up`);
		}
		if (params.get(`${prefix}-down`)) {
			brutal.down = params.get(`${prefix}-down`);
		}

		return brutal;
	}
	return null;
}

// 解析宽松格式的JSON（支持无引号的键和值）
function parseLooseJSON(jsonStr) {
	try {
		// 首先尝试标准JSON解析
		return JSON.parse(jsonStr);
	} catch (e) {
		// 如果标准解析失败，尝试宽松解析
		try {
			let processed = jsonStr.trim();

			// 支持 YAML 行内列表格式: "- { key: value, ... }"
			if (processed.startsWith('-')) {
				processed = processed.replace(/^\-\s*/, '');
			}
			// 去除可能的尾随逗号: "},"
			processed = processed.replace(/},\s*$/, '}');

			// 确保是对象格式
			if (!processed.startsWith('{') || !processed.endsWith('}')) {
				throw new Error('Invalid JSON format');
			}

			// 步骤1: 处理空值语法错误（如 flow:, 变为 flow: null,）
			processed = processed.replace(/:(\s*),/g, ': null,');
			processed = processed.replace(/:(\s*)}$/g, ': null}');

			// 步骤2: 处理单引号字符串
			processed = processed.replace(/'([^']*)'/g, '"$1"');

			// 步骤3: 为无引号的键添加引号（支持连字符）
			processed = processed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');

			// 步骤4: 处理嵌套对象中的键（多次处理确保深层嵌套）
			for (let i = 0; i < 5; i++) {
				processed = processed.replace(/({[^{}]*?)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');
			}

			// 步骤5: 为复杂的无引号字符串值添加引号（支持 Unicode 字符包括 emoji）
			// 匹配冒号后到逗号/右括号之间的内容（排除已有引号的）
			processed = processed.replace(/:(\s*)([^:,{}"\[\]]+?)\s*([,}])/g, function (_, space, value, ending) {
				const trimmedValue = value.trim();
				// 排除布尔值、null、纯数字、对象、数组
				if (trimmedValue === 'true' || trimmedValue === 'false' || trimmedValue === 'null' ||
					/^\d+(\.\d+)?$/.test(trimmedValue) || trimmedValue.startsWith('{') || trimmedValue.startsWith('[') ||
					trimmedValue.startsWith('"')) {
					return ':' + space + trimmedValue + ending;
				}
				// 为复杂字符串值添加引号（包括包含 emoji 的字符串）
				return ':' + space + '"' + trimmedValue + '"' + ending;
			});

			// 步骤6: 处理端口范围等特殊格式（如 10710-10733）
			processed = processed.replace(/:(\s*)(\d+-\d+)\s*([,}])/g, ':"$2"$3');

			// 步骤7: 处理单个字符的字符串值
			processed = processed.replace(/:(\s*)([a-zA-Z])\s*([,}])/g, function (_, space, value, ending) {
				if (value === 'true' || value === 'false' || value === 'null') {
					return ':' + space + value + ending;
				}
				return ':' + space + '"' + value + '"' + ending;
			});

			// 步骤8: 处理IP地址
			processed = processed.replace(/:(\s*)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*([,}])/g, ':"$2"$3');

			// 尝试解析处理后的JSON
			return JSON.parse(processed);
		} catch (e2) {
			// 如果还是失败，尝试更激进的方法
			try {
				let jsCode = jsonStr.trim();

				// 同样支持 YAML 行内列表格式: "- { ... }"
				if (jsCode.startsWith('-')) {
					jsCode = jsCode.replace(/^\-\s*/, '');
				}
				jsCode = jsCode.replace(/},\s*$/, '}');

				// 确保是对象格式
				if (!jsCode.startsWith('{') || !jsCode.endsWith('}')) {
					throw new Error('Invalid format');
				}

				// 预处理：修复常见的语法错误
				// 1. 处理空值语法错误
				jsCode = jsCode.replace(/:(\s*),/g, ': null,');
				jsCode = jsCode.replace(/:(\s*)}$/g, ': null}');

				// 2. 处理单引号
				jsCode = jsCode.replace(/'/g, '"');

				// 3. 为所有可能的键添加引号
				jsCode = jsCode.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');

				// 4. 为所有可能的字符串值添加引号（支持 Unicode 字符包括 emoji）
				// 匹配冒号后到逗号/右括号之间的内容（排除已有引号的）
				jsCode = jsCode.replace(/:(\s*)([^:,{}"\[\]]+?)\s*([,}])/g, function (match, space, value, ending) {
					const trimmedValue = value.trim();
					// 如果已经有引号或是特殊值，不处理
					if (trimmedValue.startsWith('"') || trimmedValue === 'true' || trimmedValue === 'false' ||
						trimmedValue === 'null' || /^\d+(\.\d+)?$/.test(trimmedValue) ||
						trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
						return match;
					}
					// 为其他所有值添加引号（包括包含 emoji 的字符串）
					return ':' + space + '"' + trimmedValue + '"' + ending;
				});

				// 5. 特殊处理：端口范围
				jsCode = jsCode.replace(/:(\s*)(\d+-\d+)\s*([,}])/g, ':"$2"$3');

				// 6. 特殊处理：IP地址
				jsCode = jsCode.replace(/:(\s*)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*([,}])/g, ':"$2"$3');

				return JSON.parse(jsCode);
			} catch (e3) {
				throw new Error(`Failed to parse loose JSON: ${e3.message}`);
			}
		}
	}
}

export { decodeBase64Text, parseBrutalConfig, parseLooseJSON, parseSmuxConfig };
